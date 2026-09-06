import RAPIER from "@dimforge/rapier3d-compat";
import {
  PlayerState,
  ServerDrone,
  ServerCamera,
  ServerZoneState,
  getResolvedWeaponPerformance,
  getWeaponReserveCapacity,
  resetWeaponSlotState,
  applyWeaponReload,
} from "./types";
import {
  DroneState,
  DroneType,
  ZONES,
  ZONES_ARRAY,
  ZONE_BOUNDS,
  TOPOLOGY,
  PLAYER_BASE_SPEED,
  PLAYER_CROUCH_SPEED,
  PLAYER_SPRINT_MULTIPLIER,
  PLAYER_DASH_MULTIPLIER,
  PLAYER_JUMP_VELOCITY,
  PLAYER_GRAVITY,
  PLAYER_CAPSULE_HALF_HEIGHT,
  PLAYER_CAPSULE_HALF_HEIGHT_CROUCH,
  ZoneName,
} from "../../shared/constants";
import { ACTIVE_GAMEMODE } from "../../shared/gamemode-configs.js";
import { createInitialUtilityState } from "../../shared/utilities.js";
import { processBotTick } from "../bot/BotController";
import { processDroneIntelligence } from "../ai/DroneIntelligence";
import { processDroneBehaviors } from "../ai/behavior/DroneBehaviorController";
import { DynamicCollisionSystem } from "../physics/DynamicCollisionSystem";
import {
  recordServerActiveDrones,
  recordServerConnectedPlayers,
  recordServerTickDuration,
  recordSecurityExploit,
} from "../sentry";
import { CollisionSystem } from "../../shared/collision";
import { OutOfBoundsEnforcer } from "../map/OutOfBoundsEnforcer";
import { benchmarkCounter, benchmarkTimer } from "../benchmark/telemetry";

export interface SimulationEngineContext {
  getRapierWorld: () => RAPIER.World | null;
  getPlayers: () => Map<string, PlayerState>;
  getDrones: () => ServerDrone[];
  getCameras: () => ServerCamera[];
  getColliderToEntityMap: () => Map<
    number,
    { type: "player"; obj: PlayerState } | { type: "drone"; obj: ServerDrone }
  >;
  getCollisionMap: () => CollisionSystem | null;
  getOutOfBoundsEnforcer: () => OutOfBoundsEnforcer;
  getSpecJson: () => any;
  getZoneSummary: () => Record<ZoneName, ServerZoneState>;
  getServerTick: () => number;
  setServerTick: (t: number) => void;
  getMatchStartTime: () => number;
  isMatchActive: () => boolean;
  isShutdown: () => boolean;
  broadcastReliableEvent: (evt: any) => void;
  handleMatchEnd: (result: "win" | "loss") => void;
  applyDamage: (
    playerId: string,
    rawDamage: number,
    type: "bullet" | "explosion" | "fall" | "melee",
    entityId: string,
    entityType: "drone" | "environment" | "player"
  ) => void;
  updateProjectiles: () => void;
  updateProximityMines: () => void;
  recordDroneHistory: () => void;
  despawnDrone: (d: ServerDrone) => void;
  processDroneKillAssists: (d: ServerDrone, killerId: string) => void;
  spawnServerProjectile?: (
    x: number,
    y: number,
    z: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    isEnemy: boolean,
    damage: number,
    sourceId: string
  ) => void;
  initDronePhysics?: (drone: any) => void;
}

export class SimulationEngine {
  public devPhysicsGravityY = -9.81;
  public devPhysicsSpeedMultiplier = 1.0;
  public devPhysicsPaused = false;
  public devPhysicsStepOnceRequested = false;

  public devCubeBody: RAPIER.RigidBody | null = null;
  public devCubeCollider: RAPIER.Collider | null = null;
  public devCubeEvents: string[] = [];
  public devCubePrevState: "air" | "ground" | "none" = "none";
  public devCubeSpawned = false;

  constructor(private context: SimulationEngineContext) {}

  public devSpawnCube(
    playerId: string,
    customPos?: { x: number; y: number; z: number }
  ): void {
    const rapierWorld = this.context.getRapierWorld();
    if (!rapierWorld) return;

    let player = this.context.getPlayers().get(playerId);
    if (!player && this.context.getPlayers().size > 0) {
      player = Array.from(this.context.getPlayers().values())[0];
    }

    let spawnX = 0,
      spawnY = 10,
      spawnZ = 0;
    if (
      customPos &&
      customPos.x !== undefined &&
      customPos.y !== undefined &&
      customPos.z !== undefined
    ) {
      spawnX = Number(customPos.x);
      spawnY = Number(customPos.y);
      spawnZ = Number(customPos.z);
    } else if (player) {
      const forwardX = Math.sin(player.yaw);
      const forwardZ = Math.cos(player.yaw);
      spawnX = player.posX + forwardX * 5.0;
      spawnY = player.posY + 3.0;
      spawnZ = player.posZ + forwardZ * 5.0;
    }

    if (this.devCubeBody) {
      try {
        rapierWorld.removeRigidBody(this.devCubeBody);
      } catch (e) {}
    }

    this.devCubeEvents = [];
    this.devCubePrevState = "air";
    this.devCubeSpawned = true;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(
      spawnX,
      spawnY,
      spawnZ
    );
    this.devCubeBody = rapierWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    this.devCubeCollider = rapierWorld.createCollider(
      colliderDesc,
      this.devCubeBody
    );

    this.devCubeEvents.push(
      `Spawned dynamic cube at (${spawnX.toFixed(2)}, ${spawnY.toFixed(
        2
      )}, ${spawnZ.toFixed(2)})`
    );
  }

  public devClearCube(): void {
    const rapierWorld = this.context.getRapierWorld();
    if (this.devCubeBody && rapierWorld) {
      try {
        rapierWorld.removeRigidBody(this.devCubeBody);
      } catch (e) {}
      this.devCubeBody = null;
      this.devCubeCollider = null;
    }
    this.devCubeSpawned = false;
    this.devCubeEvents = [];
  }

  public setDevPhysicsGravityY(gY: number): void {
    this.devPhysicsGravityY = gY;
    const rapierWorld = this.context.getRapierWorld();
    if (rapierWorld) {
      rapierWorld.gravity = { x: 0, y: gY, z: 0 };
    }
    this.context.broadcastReliableEvent({
      type: "dev_physics_settings_sync",
      gravityY: this.devPhysicsGravityY,
      speedMultiplier: this.devPhysicsSpeedMultiplier,
      paused: this.devPhysicsPaused,
    });
  }

  public setDevPhysicsSpeedMultiplier(sM: number): void {
    this.devPhysicsSpeedMultiplier = sM;
    this.context.broadcastReliableEvent({
      type: "dev_physics_settings_sync",
      gravityY: this.devPhysicsGravityY,
      speedMultiplier: this.devPhysicsSpeedMultiplier,
      paused: this.devPhysicsPaused,
    });
  }

  public setDevPhysicsPaused(p: boolean): void {
    this.devPhysicsPaused = p;
    this.context.broadcastReliableEvent({
      type: "dev_physics_settings_sync",
      gravityY: this.devPhysicsGravityY,
      speedMultiplier: this.devPhysicsSpeedMultiplier,
      paused: this.devPhysicsPaused,
    });
  }

  public setDevPhysicsStepOnce(): void {
    this.devPhysicsStepOnceRequested = true;
  }

  public tickSimulation(): void {
    const rapierWorld = this.context.getRapierWorld();
    if (!rapierWorld) return;

    const tickStart = Date.now();
    benchmarkCounter("simulation.ticks");
    let preCubePos = { x: 0, y: 0, z: 0 };
    let preCubeVel = { x: 0, y: 0, z: 0 };
    if (this.devCubeBody && this.devCubeSpawned) {
      const translation = this.devCubeBody.translation();
      preCubePos = { x: translation.x, y: translation.y, z: translation.z };
      const linvel = this.devCubeBody.linvel();
      preCubeVel = { x: linvel.x, y: linvel.y, z: linvel.z };
    }

    rapierWorld.step();

    const serverTick = this.context.getServerTick();
    const players = this.context.getPlayers();
    const drones = this.context.getDrones();

    if (serverTick % 60 === 0) {
      let activeDrones = 0;
      for (let i = 0; i < drones.length; i++) {
        if (drones[i].state !== DroneState.DEAD) activeDrones++;
      }
      recordServerActiveDrones(activeDrones);
      recordServerConnectedPlayers(players.size);
    }

    if (this.devCubeBody && this.devCubeSpawned) {
      const t = this.devCubeBody.translation();
      const vel = this.devCubeBody.linvel();

      if (
        t.y < -10 &&
        !this.devCubeEvents.some((e) => e.includes("FELL THROUGH WORLD"))
      ) {
        this.devCubeEvents.push(
          `[${serverTick}] FELL THROUGH WORLD! Pos Y: ${t.y.toFixed(2)}`
        );
      }

      let collidedWith: string[] = [];
      try {
        const sphereShape = RAPIER.ColliderDesc.ball(0.55).shape;
        rapierWorld.intersectionsWithShape(
          t,
          { x: 0, y: 0, z: 0, w: 1 },
          sphereShape,
          (collider) => {
            if (collider.handle === this.devCubeCollider?.handle) return true;

            const hitEntity = this.context
              .getColliderToEntityMap()
              .get(collider.handle);
            if (hitEntity) {
              if (hitEntity.type === "player") {
                collidedWith.push("Player");
              } else if (hitEntity.type === "drone") {
                collidedWith.push(`Drone (${hitEntity.obj.type})`);
              }
            } else {
              const colTranslation = collider.translation();
              if (collider.shapeType() === RAPIER.ShapeType.Cuboid) {
                if (Math.abs(colTranslation.y - -0.5) < 0.1) {
                  collidedWith.push("Floor");
                } else {
                  collidedWith.push("Building");
                }
              } else {
                collidedWith.push("Wall");
              }
            }
            return true;
          }
        );
      } catch (e) {}

      if (collidedWith.length > 0) {
        if (this.devCubePrevState !== "ground") {
          const dy = t.y - preCubePos.y;
          const expectedFall = this.devPhysicsGravityY * (1 / 60);
          const normalForceCorrectionY = dy - expectedFall;

          this.devCubeEvents.push(
            `COLLISION: Touch ${collidedWith.join(", ")}`
          );
          this.devCubeEvents.push(
            `  - Pre-Pos:  (${preCubePos.x.toFixed(3)}, ${preCubePos.y.toFixed(
              3
            )}, ${preCubePos.z.toFixed(3)})`
          );
          this.devCubeEvents.push(
            `  - Post-Pos: (${t.x.toFixed(3)}, ${t.y.toFixed(3)}, ${t.z.toFixed(
              3
            )})`
          );
          this.devCubeEvents.push(
            `  - Correct:  X: ${(t.x - preCubePos.x).toFixed(
              4
            )} | Y: ${normalForceCorrectionY.toFixed(4)} | Z: ${(
              t.z - preCubePos.z
            ).toFixed(4)}`
          );

          this.devCubePrevState = "ground";
        }
      } else {
        if (this.devCubePrevState === "ground" && Math.abs(vel.y) > 0.1) {
          this.devCubeEvents.push(
            `Left surface, currently in air. Vel Y: ${vel.y.toFixed(2)}`
          );
          this.devCubePrevState = "air";
        }
      }

      if (this.devCubeEvents.length > 50) {
        this.devCubeEvents.splice(0, this.devCubeEvents.length - 50);
      }
    }

    if (this.context.isMatchActive()) {
      const nextTick = serverTick + 1;
      this.context.setServerTick(nextTick);

      const matchElapsed = (Date.now() - this.context.getMatchStartTime()) / 1000;
      if (matchElapsed >= ACTIVE_GAMEMODE.matchDuration) {
        this.context.handleMatchEnd("loss");
        return;
      }

      // Respawn ticks & weapon states
      for (const player of players.values()) {
        if (player.body && player.isAlive) {
          const t = player.body.translation();
          player.posX = t.x;
          player.posY = t.y;
          player.posZ = t.z;
        }

        if (!player.isAlive) {
          player.hp = 0;
          player.inputMask = 0;
          player.fire = 0;
          player.velX = 0;
          player.velY = 0;
          player.velZ = 0;

          const dt = 0.016666;
          const beforeCeil = Math.ceil(player.respawnTimer);
          player.respawnTimer -= dt;

          if (player.respawnTimer <= 0) {
            player.isAlive = true;
            player.isDead = false;
            player.hp = player.maxHp;
            player.botActionId = 0;
            player.botTargetId = "";
            player.botTargetDist = 0;
            player.botFireCooldown = 0;
            player.botAimYaw = 0;
            player.botAimPitch = 0;

            resetWeaponSlotState(
              player.weaponState.primary,
              player.weaponState.primary.weaponId
            );
            resetWeaponSlotState(
              player.weaponState.secondary,
              player.weaponState.secondary.weaponId
            );

            if (ACTIVE_GAMEMODE.utilityResetsOnRespawn && player.utilityState) {
              player.utilityState = createInitialUtilityState(
                player.classId || "ASSAULT",
                ACTIVE_GAMEMODE.utilityCooldownMultiplier
              );
              player.channel.emit("reliable_event", {
                type: "UTILITY_STATE",
                state: player.utilityState,
              });
            }

            const specJson = this.context.getSpecJson();
            const spawnX =
              specJson?.playerSpawn?.position?.x ??
              (Math.random() - 0.5) * 40;
            const spawnY = (specJson?.playerSpawn?.position?.y ?? 0) + 5.0;
            const spawnZ =
              specJson?.playerSpawn?.position?.z ??
              120 + (Math.random() - 0.5) * 10;

            player.posX = spawnX;
            player.posY = spawnY;
            player.posZ = spawnZ;

            if (player.body) {
              player.body.setNextKinematicTranslation({
                x: player.posX,
                y: player.posY,
                z: player.posZ,
              });
            }
            player.channel.emit("reliable_event", {
              type: "YOU_RESPAWNED",
              hp: player.hp,
              position: { x: player.posX, y: player.posY, z: player.posZ },
            });
            this.context.broadcastReliableEvent({
              type: "PLAYER_RESPAWN",
              playerId: player.id,
              position: { x: player.posX, y: player.posY, z: player.posZ },
            });
          } else {
            const afterCeil = Math.ceil(player.respawnTimer);
            if (beforeCeil !== afterCeil) {
              player.channel.emit("reliable_event", {
                type: "RESPAWN_COUNTDOWN",
                remaining: afterCeil,
              });
            }
          }
          continue;
        }

        const primaryState = player.weaponState.primary;
        const secondaryState = player.weaponState.secondary;
        if (primaryState.isReloading) {
          primaryState.reloadTimer--;
          if (primaryState.reloadTimer <= 0) {
            primaryState.isReloading = false;
            applyWeaponReload(primaryState);
            player.channel.emit("reliable_event", {
              type: "AMMO_STATE",
              primary: player.weaponState.primary,
              secondary: player.weaponState.secondary,
            });
          }
        }
        if (secondaryState.isReloading) {
          secondaryState.reloadTimer--;
          if (secondaryState.reloadTimer <= 0) {
            secondaryState.isReloading = false;
            applyWeaponReload(secondaryState);
            player.channel.emit("reliable_event", {
              type: "AMMO_STATE",
              primary: player.weaponState.primary,
              secondary: player.weaponState.secondary,
            });
          }
        }

        if (player.utilityState) {
          const dt = 0.016666;
          let stateChanged = false;
          for (const slotKey of ["utility1", "utility2"] as const) {
            const uSlot = player.utilityState[slotKey];
            if (uSlot.cooldownRemaining > 0) {
              uSlot.cooldownRemaining -= dt;
              if (uSlot.cooldownRemaining <= 0) {
                uSlot.cooldownRemaining = 0;
                if (uSlot.charges < uSlot.maxCharges) {
                  uSlot.charges += 1;
                  stateChanged = true;
                  if (uSlot.charges < uSlot.maxCharges) {
                    uSlot.cooldownRemaining = uSlot.baseCooldown;
                  }
                }
              }
              if (nextTick % 10 === 0) {
                stateChanged = true;
              }
            }
          }
          if (stateChanged) {
            player.channel.emit("reliable_event", {
              type: "UTILITY_STATE",
              state: player.utilityState,
            });
          }
        }

        if (player.kcc && player.body && player.collider) {
          if (player.isBot) {
            processBotTick(player, this.context as any, 0.0166);
          }

          const inputMask = player.inputMask;
          const isForward = (inputMask & 0x01) !== 0;
          const isLeft = (inputMask & 0x02) !== 0;
          const isBackward = (inputMask & 0x04) !== 0;
          const isRight = (inputMask & 0x08) !== 0;
          const isJump = (inputMask & 0x10) !== 0;
          const isSprint = (inputMask & 0x20) !== 0;
          const isCrouch = (inputMask & 0x40) !== 0;
          const isDash = (inputMask & 0x80) !== 0;

          if (isCrouch !== (player as any).lastCrouchState) {
            if (isCrouch) {
              player.collider.setHalfHeight(PLAYER_CAPSULE_HALF_HEIGHT_CROUCH);
            } else {
              player.collider.setHalfHeight(PLAYER_CAPSULE_HALF_HEIGHT);
            }
            (player as any).lastCrouchState = isCrouch;
          }

          let speedMultiplier = 1.0;
          if (isSprint) speedMultiplier = PLAYER_SPRINT_MULTIPLIER;
          if (isCrouch)
            speedMultiplier = PLAYER_CROUCH_SPEED / PLAYER_BASE_SPEED;
          if (isDash) speedMultiplier = PLAYER_DASH_MULTIPLIER;

          let moveX = 0;
          let moveZ = 0;
          if (isForward) moveZ -= 1;
          if (isBackward) moveZ += 1;
          if (isLeft) moveX -= 1;
          if (isRight) moveX += 1;

          const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
          if (len > 0) {
            moveX /= len;
            moveZ /= len;
          }

          const dirX =
            moveX * Math.cos(player.yaw) + moveZ * Math.sin(player.yaw);
          const dirZ =
            -moveX * Math.sin(player.yaw) + moveZ * Math.cos(player.yaw);

          const moveSpeed = PLAYER_BASE_SPEED * speedMultiplier;
          player.velX = dirX * moveSpeed;
          player.velZ = dirZ * moveSpeed;

          const gravity = -PLAYER_GRAVITY;
          player.velY += gravity * 0.0166;
          const grounded = player.kcc.computedGrounded();
          if (isJump && grounded) {
            player.velY = PLAYER_JUMP_VELOCITY;
          }

          const desiredTranslation = {
            x: player.velX * 0.0166,
            y: player.velY * 0.0166,
            z: player.velZ * 0.0166,
          };

          player.kcc.computeColliderMovement(
            player.collider,
            desiredTranslation,
            RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
            undefined,
            undefined
          );

          const correctedTrans = player.kcc.computedMovement();
          const prevX = player.posX;
          const prevY = player.posY;
          const prevZ = player.posZ;

          if (player.body) {
            const currentPos = player.body.translation();
            const nextPos = {
              x: currentPos.x + correctedTrans.x,
              y: currentPos.y + correctedTrans.y,
              z: currentPos.z + correctedTrans.z,
            };
            player.body.setNextKinematicTranslation(nextPos);
            player.posX = nextPos.x;
            player.posY = nextPos.y;
            player.posZ = nextPos.z;
          }

          const dtSec = 0.016666;
          player.stats.timeAlive += dtSec;
          const pDx = player.posX - prevX;
          const pDy = player.posY - prevY;
          const pDz = player.posZ - prevZ;
          player.stats.distanceTravelled += Math.sqrt(
            pDx * pDx + pDy * pDy + pDz * pDz
          );

          // Objective Proximity Radius Check
          const coreX = 384;
          const coreZ = 384;
          const objRad = ACTIVE_GAMEMODE.objectiveProximityRadius || 3;
          const odx = player.posX - coreX;
          const odz = player.posZ - coreZ;
          const inObjRadius = odx * odx + odz * odz <= objRad * objRad;

          if (inObjRadius) {
            player.stats.objectiveTimeHeld += dtSec;
            if (player.isHoldingObjective) {
              player.currentObjectiveProgress =
                (player.currentObjectiveProgress || 0) + dtSec;
              const reqHold = ACTIVE_GAMEMODE.objectiveHoldTime || 8.0;

              if (
                nextTick % 10 === 0 ||
                player.currentObjectiveProgress >= reqHold
              ) {
                player.channel.emit("reliable_event", {
                  type: "OBJECTIVE_PROGRESS",
                  progressSec: player.currentObjectiveProgress,
                  requiredSec: reqHold,
                });
              }

              if (player.currentObjectiveProgress >= reqHold) {
                this.context.handleMatchEnd("win");
              }
            }
          }

          if (player.posY < prevY && player.velY < -5.0) {
            if (player.lastFallStartY === 0) player.lastFallStartY = prevY;
          }
          const isCurrentlyGrounded = player.kcc.computedGrounded();
          if (isCurrentlyGrounded) {
            player.velY = 0;
            if (player.lastFallStartY > 0) {
              const fallDist = player.lastFallStartY - player.posY;
              player.lastFallStartY = 0;
              if (fallDist > 14.0) {
                const fallDamage = Math.floor((fallDist - 14.0) * 12.0);
                if (fallDamage > 0) {
                  this.context.applyDamage(
                    player.id,
                    fallDamage,
                    "fall",
                    "0",
                    "environment"
                  );
                }
              }
            }
          }

          const actualVx = (player.posX - prevX) / 0.0166;
          const actualVy = (player.posY - prevY) / 0.0166;
          const actualVz = (player.posZ - prevZ) / 0.0166;
          const speedSq = actualVx * actualVx + actualVz * actualVz;
          if (speedSq > 900) {
            recordSecurityExploit("speed_teleport_detected", {
              playerId: player.id,
              speed: Math.sqrt(speedSq),
              pos: { x: player.posX, y: player.posY, z: player.posZ },
            });
          }
          player.velEmaX = player.velEmaX * 0.8 + actualVx * 0.2;
          player.velEmaY = player.velEmaY * 0.8 + actualVy * 0.2;
          player.velEmaZ = player.velEmaZ * 0.8 + actualVz * 0.2;
        }
      }

      this.context.getOutOfBoundsEnforcer().tick(this.context as any, 16.66);
      this.updateSystemEntities();
    }

    const durationMs = Date.now() - tickStart;
    benchmarkTimer("simulation.tick", durationMs);
    recordServerTickDuration(durationMs);
  }

  private updateSystemEntities(): void {
    const players = this.context.getPlayers();
    const drones = this.context.getDrones();
    const cameras = this.context.getCameras();
    const zoneSummary = this.context.getZoneSummary();
    const rapierWorld = this.context.getRapierWorld();

    this.context.updateProjectiles();

    let targetPlayer: PlayerState | null = null;
    for (const p of players.values()) {
      targetPlayer = p;
      break;
    }

    const nowMs = Date.now();
    for (const zoneId of ZONES_ARRAY) {
      if (zoneSummary[zoneId]) {
        zoneSummary[zoneId].droneGroups.length = 0;
      }
    }
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (d.state !== DroneState.DEAD && zoneSummary[d.zone]) {
        if (!zoneSummary[d.zone].droneGroups.includes(d.groupId)) {
          zoneSummary[d.zone].droneGroups.push(d.groupId);
        }
      }
    }

    let detectedZones = new Set<ZoneName>();
    if (targetPlayer) {
      let playerZone: ZoneName = ZONES.CORE;
      for (const zoneId of ZONES_ARRAY) {
        const b = ZONE_BOUNDS[zoneId];
        const dx = Math.abs(targetPlayer.posX - b.center.x);
        const dy = Math.abs(targetPlayer.posY - b.center.y);
        const dz = Math.abs(targetPlayer.posZ - b.center.z);
        if (dx <= b.halfSize.x && dy <= b.halfSize.y && dz <= b.halfSize.z) {
          playerZone = zoneId;
          break;
        }
      }
      targetPlayer.zone = playerZone;

      for (let i = 0; i < drones.length; i++) {
        const d = drones[i];
        if (
          d.state !== DroneState.DEAD &&
          d.zone === playerZone &&
          d.type !== DroneType.BOMBER &&
          d.type !== DroneType.FIXED_WING
        ) {
          const dx = targetPlayer.posX - d.posX;
          const dy = targetPlayer.posY - d.posY;
          const dz = targetPlayer.posZ - d.posZ;
          if (dx * dx + dy * dy + dz * dz < 900) {
            detectedZones.add(playerZone);
            break;
          }
        }
      }

      for (let c = 0; c < cameras.length; c++) {
        if (
          cameras[c].isActive &&
          (!cameras[c].disabledUntil || cameras[c].disabledUntil! <= nowMs)
        ) {
          const dx = targetPlayer.posX - cameras[c].posX;
          const dy = targetPlayer.posY - cameras[c].posY;
          const dz = targetPlayer.posZ - cameras[c].posZ;
          if (
            dx * dx + dy * dy + dz * dz <
            cameras[c].detectionRadius * cameras[c].detectionRadius
          ) {
            let hasLOS = true;
            if (rapierWorld) {
              const rayDir = {
                x: targetPlayer.posX - cameras[c].posX,
                y: targetPlayer.posY - cameras[c].posY,
                z: targetPlayer.posZ - cameras[c].posZ,
              };
              const len = Math.sqrt(
                rayDir.x * rayDir.x + rayDir.y * rayDir.y + rayDir.z * rayDir.z
              );
              if (len > 0) {
                rayDir.x /= len;
                rayDir.y /= len;
                rayDir.z /= len;
                const ray = new RAPIER.Ray(
                  {
                    x: cameras[c].posX,
                    y: cameras[c].posY,
                    z: cameras[c].posZ,
                  },
                  rayDir
                );
                const hit = rapierWorld.castRay(
                  ray,
                  len,
                  true,
                  RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC
                );
                if (hit && hit.collider && hit.timeOfImpact < len - 0.7) {
                  hasLOS = false;
                }
              }
            }
            if (hasLOS) detectedZones.add(playerZone);
          }
        }
      }

      if (targetPlayer.firedThisTick) {
        detectedZones.add(playerZone);
        for (const adj of TOPOLOGY[playerZone] || []) {
          detectedZones.add(adj);
        }
      }

      const isSignalDisrupted =
        targetPlayer.signalDisruptorUntil &&
        targetPlayer.signalDisruptorUntil > nowMs;
      if (isSignalDisrupted) {
        detectedZones.clear();
      }

      for (const zoneId of ZONES_ARRAY) {
        const z = zoneSummary[zoneId];
        if (!z) continue;
        if (isSignalDisrupted && zoneId === playerZone) {
          z.confidence = 0.0;
        } else if (detectedZones.has(zoneId)) {
          z.confidence = 1.0;
          z.lastSeenTimestamp = nowMs;
        } else {
          const elapsed =
            z.lastSeenTimestamp > 0 ? nowMs - z.lastSeenTimestamp : 60000;
          z.confidence = Math.max(
            0.0,
            Math.min(1.0, Math.round((1.0 - elapsed / 60000) * 100) / 100)
          );
          for (let i = 0; i < drones.length; i++) {
            if (
              drones[i].state !== DroneState.DEAD &&
              drones[i].type === DroneType.RECON &&
              drones[i].zone === zoneId
            ) {
              z.confidence = 1.0;
            }
          }
        }
      }
    }

    processDroneIntelligence(
      nowMs,
      drones,
      players,
      rapierWorld,
      RAPIER,
      0.0166,
      this.context.getCollisionMap()
    );

    processDroneBehaviors(
      drones,
      {
        ...this.context,
        players,
        drones,
        rapierWorld,
        serverTick: this.context.getServerTick(),
        initDronePhysics: (drone: any) => {
          if (this.context.initDronePhysics) {
            this.context.initDronePhysics(drone);
          }
        },
        spawnServerProjectile: (
          x: number,
          y: number,
          z: number,
          dirX: number,
          dirY: number,
          dirZ: number,
          isEnemy: boolean,
          damage: number,
          sourceId: string
        ) => {
          if (this.context.spawnServerProjectile) {
            this.context.spawnServerProjectile(
              x,
              y,
              z,
              dirX,
              dirY,
              dirZ,
              isEnemy,
              damage,
              sourceId
            );
          }
        },
      } as any,
      0.0166,
      nowMs
    );
    DynamicCollisionSystem.resolve(players, drones);
    this.context.updateProximityMines();

    for (const p of players.values()) {
      p.firedThisTick = false;
    }

    this.context.recordDroneHistory();
  }
}
