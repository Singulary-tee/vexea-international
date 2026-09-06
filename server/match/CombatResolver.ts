import RAPIER from "@dimforge/rapier3d-compat";
import {
  MAX_PROJECTILES,
  HISTORICAL_SAMPLES_MAX,
  HISTORIC_BLOCK_SIZE,
  PlayerState,
  ServerDrone,
  ServerCamera,
} from "./types";
import {
  DroneState,
  DroneType,
  PLAYER_MAX_HP,
  PLAYER_RESPAWN_DELAY_DEFAULT,
} from "../../shared/constants";
import { ACTIVE_GAMEMODE } from "../../shared/gamemode-configs.js";
import {
  UTILITIES,
  GRENADE_DAMAGE,
  GRENADE_RADIUS,
  GRENADE_FUSE_TIME,
  FLASHBANG_RADIUS,
  FLASHBANG_DURATION,
  MEDKIT_HEAL_AMOUNT,
  MEDKIT_TARGET_RADIUS,
  REVIVE_HEALTH_RESTORED,
  REVIVE_TARGET_RADIUS,
  RADIO_MAX_CHARGES,
  SIGNAL_JAMMER_DURATION,
  SIGNAL_JAMMER_RADIUS,
  PROXIMITY_MINE_DAMAGE,
  PROXIMITY_MINE_RADIUS,
  PROXIMITY_MINE_TRIGGER_RADIUS,
  C4_DAMAGE,
  C4_RADIUS,
} from "../../shared/utilities";
import { CollisionSystem } from "../../shared/collision";

export interface CombatResolverContext {
  getPlayers: () => Map<string, PlayerState>;
  getDrones: () => ServerDrone[];
  getCameras: () => ServerCamera[];
  getRapierWorld: () => RAPIER.World | null;
  getCollisionMap: () => CollisionSystem | null;
  getServerTick: () => number;
  isShutdown: () => boolean;
  broadcastReliableEvent: (evt: any) => void;
  despawnDrone: (d: ServerDrone) => void;
  getCommanderMemory: () => any;
  getLLMCommander: () => any;
}

export class CombatResolver {
  public projActive = new Uint8Array(MAX_PROJECTILES);
  public projPosX = new Float32Array(MAX_PROJECTILES);
  public projPosY = new Float32Array(MAX_PROJECTILES);
  public projPosZ = new Float32Array(MAX_PROJECTILES);
  public projVelX = new Float32Array(MAX_PROJECTILES);
  public projVelY = new Float32Array(MAX_PROJECTILES);
  public projVelZ = new Float32Array(MAX_PROJECTILES);
  public projDamage = new Float32Array(MAX_PROJECTILES);
  public projDist = new Float32Array(MAX_PROJECTILES);
  public projEnemy = new Uint8Array(MAX_PROJECTILES);
  public projSourceId: string[] = new Array(MAX_PROJECTILES).fill("");

  public historicalAABBHistory = new Float32Array(
    HISTORICAL_SAMPLES_MAX * HISTORIC_BLOCK_SIZE
  );
  public historicalAABBIndex = 0;

  public activeC4Map: Map<string, { x: number; y: number; z: number }> = new Map();
  public proximityMines: {
    id: string;
    ownerId: string;
    x: number;
    y: number;
    z: number;
    triggered: boolean;
  }[] = [];

  constructor(private context: CombatResolverContext) {}

  public spawnServerProjectile(
    x: number,
    y: number,
    z: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    isEnemy: boolean,
    damage: number,
    sourceId: string
  ): void {
    let pIdx = -1;
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (!this.projActive[i]) {
        pIdx = i;
        break;
      }
    }
    if (pIdx !== -1) {
      this.projActive[pIdx] = 1;
      this.projPosX[pIdx] = x;
      this.projPosY[pIdx] = y;
      this.projPosZ[pIdx] = z;
      const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
      this.projVelX[pIdx] = len > 0.001 ? (dirX / len) * 35.0 : 0;
      this.projVelY[pIdx] = len > 0.001 ? (dirY / len) * 35.0 : 0;
      this.projVelZ[pIdx] = len > 0.001 ? (dirZ / len) * 35.0 : 0;
      this.projDamage[pIdx] = damage;
      this.projDist[pIdx] = 0;
      this.projEnemy[pIdx] = isEnemy ? 1 : 0;
      this.projSourceId[pIdx] = sourceId;

      const p = this.context.getPlayers().get(sourceId);
      if (p) {
        p.firedThisTick = true;
      }
    }
  }

  public updateProjectiles(): void {
    const players = this.context.getPlayers();
    const drones = this.context.getDrones();
    const cameras = this.context.getCameras();
    const serverTick = this.context.getServerTick();

    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (this.projActive[i]) {
        this.projPosX[i] += this.projVelX[i] * 0.1666;
        this.projPosY[i] += this.projVelY[i] * 0.1666;
        this.projPosZ[i] += this.projVelZ[i] * 0.1666;
        this.projDist[i] +=
          Math.sqrt(
            this.projVelX[i] * this.projVelX[i] +
              this.projVelY[i] * this.projVelY[i] +
              this.projVelZ[i] * this.projVelZ[i]
          ) * 0.1666;

        if (
          this.projDist[i] >= 40 ||
          Math.abs(this.projPosX[i]) > 100 ||
          Math.abs(this.projPosZ[i]) > 100 ||
          this.projPosY[i] < 0
        ) {
          this.projActive[i] = 0;
          continue;
        }

        if (this.projEnemy[i]) {
          for (const player of players.values()) {
            if (!player.isAlive) continue;
            if (player.id === this.projSourceId[i]) continue;
            const dx = player.posX - this.projPosX[i];
            const dy = player.posY - this.projPosY[i];
            const dz = player.posZ - this.projPosZ[i];
            if (dx * dx + dy * dy + dz * dz < 2.25) {
              this.applyDamage(
                player.id,
                this.projDamage[i],
                "bullet",
                this.projSourceId[i],
                "drone"
              );
              this.projActive[i] = 0;
              break;
            }
          }
        } else {
          for (let j = 0; j < drones.length; j++) {
            const d = drones[j];
            if (d.state !== DroneState.DEAD) {
              if (d.id.toString() === this.projSourceId[i]) continue;
              const dx = d.posX - this.projPosX[i];
              const dy = d.posY - this.projPosY[i];
              const dz = d.posZ - this.projPosZ[i];
              if (dx * dx + dy * dy + dz * dz < d.rad * d.rad) {
                d.hp -= this.projDamage[i];
                d.lastDamageTick = serverTick;
                if (!d.damageLog) d.damageLog = [];
                d.damageLog.push({
                  playerId: this.projSourceId[i],
                  timestamp: Date.now(),
                });
                this.projActive[i] = 0;
                if (d.hp <= 0) {
                  this.processDroneKillAssists(d, this.projSourceId[i]);
                  const killer = players.get(this.projSourceId[i]);
                  if (killer) {
                    killer.stats.droneEliminations += 1;
                    killer.stats.scoreIndividual += 100;
                  }
                  this.context.despawnDrone(d);
                  this.context.broadcastReliableEvent({
                    type: "drone_killed",
                    id: d.id,
                    zone: d.zone,
                  });
                }
                break;
              }
            }
          }

          if (this.projActive[i]) {
            for (let j = 0; j < cameras.length; j++) {
              if (cameras[j].isActive) {
                const dx = cameras[j].posX - this.projPosX[i];
                const dy = cameras[j].posY - this.projPosY[i];
                const dz = cameras[j].posZ - this.projPosZ[i];
                if (dx * dx + dy * dy + dz * dz < 4) {
                  cameras[j].hp -= this.projDamage[i];
                  this.projActive[i] = 0;
                  if (cameras[j].hp <= 0) cameras[j].isActive = false;
                  break;
                }
              }
            }
          }
        }
      }
    }
  }

  public recordDroneHistory(): void {
    const drones = this.context.getDrones();
    const serverTick = this.context.getServerTick();
    const baseIdx = this.historicalAABBIndex * HISTORIC_BLOCK_SIZE;
    this.historicalAABBHistory[baseIdx] = serverTick;
    let count = 0;
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (d.state !== DroneState.DEAD) {
        const dBase = baseIdx + 2 + count * 4;
        this.historicalAABBHistory[dBase] = d.id;
        this.historicalAABBHistory[dBase + 1] = d.posX;
        this.historicalAABBHistory[dBase + 2] = d.posY;
        this.historicalAABBHistory[dBase + 3] = d.posZ;
        count++;
      }
    }
    this.historicalAABBHistory[baseIdx + 1] = count;
    this.historicalAABBIndex =
      (this.historicalAABBIndex + 1) % HISTORICAL_SAMPLES_MAX;
  }

  public executeAABBShotValidation(
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    timestamp: number
  ): { hit: boolean; droneId: number } {
    const drones = this.context.getDrones();
    const collisionMap = this.context.getCollisionMap();
    const serverTick = this.context.getServerTick();

    let bestHitDrone: ServerDrone | null = null;
    let minTimeOfImpact = 999999.0;

    const pingCompensatedTick = Math.max(
      0,
      serverTick - Math.min(12, Math.floor(timestamp / 16.6))
    );
    let recordFoundIdx = -1;
    for (let r = 0; r < HISTORICAL_SAMPLES_MAX; r++) {
      const baseIdx = r * HISTORIC_BLOCK_SIZE;
      if (this.historicalAABBHistory[baseIdx] === pingCompensatedTick) {
        recordFoundIdx = baseIdx;
        break;
      }
    }

    if (recordFoundIdx !== -1) {
      const recordedCount = this.historicalAABBHistory[recordFoundIdx + 1];
      for (let i = 0; i < recordedCount; i++) {
        const dBase = recordFoundIdx + 2 + i * 4;
        const dId = this.historicalAABBHistory[dBase];
        const rx = this.historicalAABBHistory[dBase + 1];
        const ry = this.historicalAABBHistory[dBase + 2];
        const rz = this.historicalAABBHistory[dBase + 3];

        const droneRef = drones.find((d) => d.id === dId);
        if (droneRef && droneRef.state !== DroneState.DEAD) {
          const distToDrone = Math.sqrt(
            (rx - origin.x) * (rx - origin.x) +
              (ry - origin.y) * (ry - origin.y) +
              (rz - origin.z) * (rz - origin.z)
          );
          if (distToDrone < minTimeOfImpact) {
            minTimeOfImpact = distToDrone;
            bestHitDrone = droneRef;
          }
        }
      }
    } else {
      for (let i = 0; i < drones.length; i++) {
        const d = drones[i];
        if (d.state !== DroneState.DEAD) {
          const distToDrone = Math.sqrt(
            (d.posX - origin.x) * (d.posX - origin.x) +
              (d.posY - origin.y) * (d.posY - origin.y) +
              (d.posZ - origin.z) * (d.posZ - origin.z)
          );
          if (distToDrone < minTimeOfImpact) {
            minTimeOfImpact = distToDrone;
            bestHitDrone = d;
          }
        }
      }
    }

    if (bestHitDrone) {
      if (
        collisionMap &&
        collisionMap.rayIntersectsAny(origin, dir, minTimeOfImpact)
      ) {
        return { hit: false, droneId: 0 };
      }
      return { hit: true, droneId: bestHitDrone.id };
    }
    return { hit: false, droneId: 0 };
  }

  public applyDamage(
    playerId: string,
    rawDamage: number,
    type: "bullet" | "explosion" | "fall" | "melee",
    entityId: string,
    entityType: "drone" | "environment" | "player"
  ): void {
    const p = this.context.getPlayers().get(playerId);
    if (!p || !p.isAlive) return;

    if (p.godMode) {
      p.hp = PLAYER_MAX_HP;
      p.channel.emit("reliable_event", {
        type: "PLAYER_HIT",
        hp: p.hp,
        rawDamage: 0,
      });
      return;
    }

    p.hp -= rawDamage;
    p.stats.damageReceived += rawDamage;
    p.lastDamageSource = { type, entityId, entityType };

    if (
      ACTIVE_GAMEMODE.objectiveResetOnDamage &&
      (p.currentObjectiveProgress || 0) > 0
    ) {
      p.currentObjectiveProgress = 0;
      p.isHoldingObjective = false;
      p.channel.emit("reliable_event", {
        type: "OBJECTIVE_INTERRUPTED",
      });
    }

    p.channel.emit("reliable_event", {
      type: "PLAYER_HIT",
      hp: p.hp,
      rawDamage,
    });

    if (p.hp <= 0) {
      p.hp = 0;
      p.isAlive = false;
      p.isDead = true;
      p.respawnTimer = PLAYER_RESPAWN_DELAY_DEFAULT;
      p.deathPosition = { x: p.posX, y: p.posY, z: p.posZ };
      p.stats.deaths++;

      console.log("[DEATH] player died:", playerId, "source:", type);

      p.channel.emit("reliable_event", {
        type: "YOU_DIED",
        respawnTime: PLAYER_RESPAWN_DELAY_DEFAULT,
      });
      this.context.broadcastReliableEvent({
        type: "PLAYER_DEATH",
        playerId,
        deathPosition: p.deathPosition,
        killerId: entityId,
      });
    }
  }

  public applyExplosionDamage(
    origin: { x: number; y: number; z: number },
    radius: number,
    maxDamage: number,
    sourceId: string,
    sourceType: "drone" | "environment" | "player"
  ): void {
    const players = this.context.getPlayers();
    const drones = this.context.getDrones();
    const serverTick = this.context.getServerTick();

    this.context.broadcastReliableEvent({ type: "EXPLOSION", origin, radius });

    for (const player of players.values()) {
      if (!player.isAlive) continue;
      const dx = player.posX - origin.x;
      const dy = player.posY - origin.y;
      const dz = player.posZ - origin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < radius) {
        const factor = 1.0 - dist / radius;
        const splash = Math.floor(maxDamage * factor);
        if (splash > 0) {
          this.applyDamage(player.id, splash, "explosion", sourceId, sourceType);
        }
      }
    }

    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (d.state !== DroneState.DEAD) {
        if (sourceType === "drone" && d.id.toString() === sourceId) {
          continue;
        }

        const dx = d.posX - origin.x;
        const dy = d.posY - origin.y;
        const dz = d.posZ - origin.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < radius) {
          const factor = 1.0 - dist / radius;
          const splash = Math.floor(maxDamage * factor);
          d.hp -= splash;
          d.lastDamageTick = serverTick;
          if (sourceType === "player") {
            if (!d.damageLog) d.damageLog = [];
            d.damageLog.push({
              playerId: sourceId,
              timestamp: Date.now(),
            });
          }
          if (d.hp <= 0) {
            this.processDroneKillAssists(d, sourceId);
            const killer = players.get(sourceId);
            if (killer) {
              killer.stats.droneEliminations += 1;
              killer.stats.scoreIndividual += 100;
            }
            this.context.despawnDrone(d);
            this.context.broadcastReliableEvent({
              type: "drone_killed",
              id: d.id,
              zone: d.zone,
            });
          }
        }
      }
    }
  }

  public processDroneKillAssists(drone: ServerDrone, killerId: string): void {
    if (!drone.damageLog || drone.damageLog.length === 0) return;
    const now = Date.now();
    const assistThresholdMs = 10000;
    const creditedAssists = new Set<string>();

    for (const entry of drone.damageLog) {
      if (
        entry.playerId &&
        entry.playerId !== killerId &&
        !creditedAssists.has(entry.playerId)
      ) {
        if (now - entry.timestamp <= assistThresholdMs) {
          creditedAssists.add(entry.playerId);
          const assistingPlayer = this.context.getPlayers().get(entry.playerId);
          if (assistingPlayer) {
            assistingPlayer.stats.assists += 1;
            assistingPlayer.stats.scoreIndividual +=
              ACTIVE_GAMEMODE.scoreValues.assistElimination || 50;
          }
        }
      }
    }
  }

  public useUtility(playerId: string, slot: "utility1" | "utility2"): void {
    const players = this.context.getPlayers();
    const player = players.get(playerId);
    if (!player || !player.isAlive || !player.utilityState) return;

    const uSlot = player.utilityState[slot];
    if (!uSlot || uSlot.charges <= 0) return;

    const commanderMemory = this.context.getCommanderMemory();
    if (commanderMemory) {
      commanderMemory.onUtilityUsed(playerId, uSlot.id);
    }

    uSlot.charges -= 1;
    if (uSlot.cooldownRemaining <= 0) {
      uSlot.cooldownRemaining = uSlot.baseCooldown;
    }

    player.channel.emit("reliable_event", {
      type: "UTILITY_STATE",
      state: player.utilityState,
    });

    this.context.broadcastReliableEvent({
      type: "UTILITY_ACTIVATED",
      playerId: player.id,
      utilityId: uSlot.id,
      slot: slot,
    });

    const throwOrigin = { x: player.posX, y: player.posY + 1.6, z: player.posZ };
    const dirX = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const dirY = Math.sin(player.pitch);
    const dirZ = -Math.cos(player.yaw) * Math.cos(player.pitch);

    switch (uSlot.id) {
      case "Grenade": {
        const throwDist = 12.0;
        const targetPos = {
          x: throwOrigin.x + dirX * throwDist,
          y: Math.max(0, throwOrigin.y + dirY * throwDist),
          z: throwOrigin.z + dirZ * throwDist,
        };
        setTimeout(() => {
          this.resolveGrenadeExplosion(player.id, targetPos);
        }, GRENADE_FUSE_TIME * 1000);
        break;
      }
      case "Flashbang": {
        const throwDist = 10.0;
        const targetPos = {
          x: throwOrigin.x + dirX * throwDist,
          y: Math.max(0, throwOrigin.y + dirY * throwDist),
          z: throwOrigin.z + dirZ * throwDist,
        };
        setTimeout(() => {
          this.resolveFlashbangDetonation(player.id, targetPos);
        }, 1.5 * 1000);
        break;
      }
      case "Med Kit": {
        let targetPlayer = player;
        let minDist = MEDKIT_TARGET_RADIUS;
        for (const otherPlayer of players.values()) {
          if (otherPlayer.id === player.id || !otherPlayer.isAlive) continue;
          const dx = otherPlayer.posX - player.posX;
          const dy = otherPlayer.posY - player.posY;
          const dz = otherPlayer.posZ - player.posZ;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist <= minDist) {
            minDist = dist;
            targetPlayer = otherPlayer;
          }
        }
        const oldHp = targetPlayer.hp;
        targetPlayer.hp = Math.min(PLAYER_MAX_HP, targetPlayer.hp + MEDKIT_HEAL_AMOUNT);
        const actualHealed = targetPlayer.hp - oldHp;

        targetPlayer.channel.emit("reliable_event", {
          type: "PLAYER_HIT",
          hp: targetPlayer.hp,
          rawDamage: -actualHealed,
        });

        this.context.broadcastReliableEvent({
          type: "UTILITY_EFFECT",
          utilityId: "Med Kit",
          playerId: player.id,
          targetId: targetPlayer.id,
          healedAmount: actualHealed,
          newHp: targetPlayer.hp,
        });
        break;
      }
      case "Revive Tool": {
        let targetDownedPlayer: PlayerState | null = null;
        let minDist = REVIVE_TARGET_RADIUS;
        for (const otherPlayer of players.values()) {
          if (otherPlayer.id === player.id || otherPlayer.isAlive) continue;
          const dx = otherPlayer.posX - player.posX;
          const dy = otherPlayer.posY - player.posY;
          const dz = otherPlayer.posZ - player.posZ;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist <= minDist) {
            minDist = dist;
            targetDownedPlayer = otherPlayer;
          }
        }

        if (targetDownedPlayer) {
          targetDownedPlayer.isAlive = true;
          targetDownedPlayer.isDead = false;
          targetDownedPlayer.respawnTimer = 0;
          targetDownedPlayer.hp = REVIVE_HEALTH_RESTORED;
          player.stats.revivesPerformed += 1;

          targetDownedPlayer.channel.emit("reliable_event", {
            type: "PLAYER_REVIVED",
            hp: targetDownedPlayer.hp,
            revivedBy: player.id,
          });

          this.context.broadcastReliableEvent({
            type: "UTILITY_EFFECT",
            utilityId: "Revive Tool",
            playerId: player.id,
            targetId: targetDownedPlayer.id,
            restoredHp: targetDownedPlayer.hp,
          });
        }
        break;
      }
      case UTILITIES["Radio"].id: {
        uSlot.charges = RADIO_MAX_CHARGES;
        const llm = this.context.getLLMCommander();
        const summary = llm?.lastCycleSummary || "NO TRANSMISSION DETECTED";
        player.channel.emit("radio_intercept", { summary });
        this.context.broadcastReliableEvent({
          type: "UTILITY_EFFECT",
          utilityId: UTILITIES["Radio"].id,
          playerId: player.id,
        });
        break;
      }
      case UTILITIES["Signal Jammer"].id: {
        const nowMs = Date.now();
        player.signalDisruptorUntil = nowMs + SIGNAL_JAMMER_DURATION * 1000;
        let disabledCount = 0;
        const cameras = this.context.getCameras();
        for (let c = 0; c < cameras.length; c++) {
          const cam = cameras[c];
          if (!cam.isActive) continue;
          const dx = cam.posX - throwOrigin.x;
          const dy = cam.posY - throwOrigin.y;
          const dz = cam.posZ - throwOrigin.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist <= SIGNAL_JAMMER_RADIUS) {
            cam.disabledUntil = nowMs + SIGNAL_JAMMER_DURATION * 1000;
            disabledCount++;
          }
        }
        this.context.broadcastReliableEvent({
          type: "UTILITY_EFFECT",
          utilityId: UTILITIES["Signal Jammer"].id,
          playerId: player.id,
          origin: throwOrigin,
          radius: SIGNAL_JAMMER_RADIUS,
          duration: SIGNAL_JAMMER_DURATION,
          disabledCameras: disabledCount,
        });
        break;
      }
      case UTILITIES["Proximity Mine"].id: {
        const mineId = `mine_${player.id}_${Date.now()}`;
        const placePos = {
          x: throwOrigin.x,
          y: throwOrigin.y,
          z: throwOrigin.z,
        };
        this.proximityMines.push({
          id: mineId,
          ownerId: player.id,
          x: placePos.x,
          y: placePos.y,
          z: placePos.z,
          triggered: false,
        });
        this.context.broadcastReliableEvent({
          type: "UTILITY_EFFECT",
          utilityId: UTILITIES["Proximity Mine"].id,
          action: "place",
          playerId: player.id,
          origin: placePos,
        });
        break;
      }
      case "C4": {
        const activeC4 = this.activeC4Map.get(player.id);
        if (activeC4) {
          this.activeC4Map.delete(player.id);
          this.applyExplosionDamage(activeC4, C4_RADIUS, C4_DAMAGE, player.id, "player");
          this.context.broadcastReliableEvent({
            type: "UTILITY_EFFECT",
            utilityId: "C4",
            action: "detonate",
            playerId: player.id,
            origin: activeC4,
            radius: C4_RADIUS,
            damage: C4_DAMAGE,
          });
        } else {
          const placePos = {
            x: throwOrigin.x + dirX * 1.5,
            y: throwOrigin.y,
            z: throwOrigin.z + dirZ * 1.5,
          };
          this.activeC4Map.set(player.id, placePos);
          this.context.broadcastReliableEvent({
            type: "UTILITY_EFFECT",
            utilityId: "C4",
            action: "place",
            playerId: player.id,
            origin: placePos,
          });
        }
        break;
      }
    }
  }

  public updateProximityMines(): void {
    const drones = this.context.getDrones();
    if (this.proximityMines.length === 0) return;

    let writeIdx = 0;
    for (let m = 0; m < this.proximityMines.length; m++) {
      const mine = this.proximityMines[m];
      if (mine.triggered) continue;

      let triggered = false;
      for (let i = 0; i < drones.length; i++) {
        const d = drones[i];
        if (d.state === DroneState.DEAD) continue;

        const dx = d.posX - mine.x;
        const dy = d.posY - mine.y;
        const dz = d.posZ - mine.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= PROXIMITY_MINE_TRIGGER_RADIUS) {
          triggered = true;
          break;
        }
      }

      if (triggered) {
        mine.triggered = true;
        this.applyExplosionDamage(
          mine,
          PROXIMITY_MINE_RADIUS,
          PROXIMITY_MINE_DAMAGE,
          mine.ownerId,
          "player"
        );
        this.context.broadcastReliableEvent({
          type: "UTILITY_EFFECT",
          utilityId: UTILITIES["Proximity Mine"].id,
          action: "detonate",
          playerId: mine.ownerId,
          origin: mine,
          radius: PROXIMITY_MINE_RADIUS,
          damage: PROXIMITY_MINE_DAMAGE,
        });
      } else {
        this.proximityMines[writeIdx] = mine;
        writeIdx++;
      }
    }
    this.proximityMines.length = writeIdx;
  }

  public resolveGrenadeExplosion(attackerId: string, origin: { x: number; y: number; z: number }): void {
    if (this.context.isShutdown()) return;

    this.context.broadcastReliableEvent({
      type: "UTILITY_EFFECT",
      utilityId: "Grenade",
      origin: origin,
      radius: GRENADE_RADIUS,
    });

    const drones = this.context.getDrones();
    const players = this.context.getPlayers();

    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (d.state === DroneState.DEAD) continue;
      const dx = d.posX - origin.x;
      const dy = d.posY - origin.y;
      const dz = d.posZ - origin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= GRENADE_RADIUS) {
        const falloff = 1.0 - (dist / GRENADE_RADIUS) * 0.5;
        const dmg = GRENADE_DAMAGE * falloff;
        d.hp -= dmg;
        if (d.hp <= 0) {
          this.processDroneKillAssists(d, attackerId);
          this.context.despawnDrone(d);
          const attacker = players.get(attackerId);
          if (attacker) {
            attacker.score += 100;
            attacker.stats.droneEliminations += 1;
            attacker.stats.scoreIndividual += 100;
          }
        }
      }
    }

    for (const p of players.values()) {
      if (!p.isAlive) continue;
      const dx = p.posX - origin.x;
      const dy = p.posY - origin.y;
      const dz = p.posZ - origin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= GRENADE_RADIUS) {
        const falloff = 1.0 - (dist / GRENADE_RADIUS) * 0.5;
        const dmg = GRENADE_DAMAGE * falloff;
        p.hp -= dmg;
        p.channel.emit("reliable_event", {
          type: "PLAYER_HIT",
          hp: p.hp,
          rawDamage: dmg,
        });
        if (p.hp <= 0) {
          p.isAlive = false;
          p.isDead = true;
          p.respawnTimer = 5;
          p.stats.deaths += 1;
          p.channel.emit("reliable_event", {
            type: "YOU_DIED",
            respawnTimer: 5,
          });
        }
      }
    }
  }

  public resolveFlashbangDetonation(attackerId: string, origin: { x: number; y: number; z: number }): void {
    if (this.context.isShutdown()) return;

    this.context.broadcastReliableEvent({
      type: "FLASHBANG_DETONATED",
      origin: origin,
      radius: FLASHBANG_RADIUS,
    });

    for (const p of this.context.getPlayers().values()) {
      if (!p.isAlive) continue;
      const dx = p.posX - origin.x;
      const dy = p.posY - origin.y;
      const dz = p.posZ - origin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= FLASHBANG_RADIUS) {
        const intensity = Math.max(0.2, 1.0 - (dist / FLASHBANG_RADIUS) * 0.7);
        p.channel.emit("reliable_event", {
          type: "FLASHBANG_HIT",
          duration: FLASHBANG_DURATION,
          intensity: intensity,
        });
      }
    }
  }
}
