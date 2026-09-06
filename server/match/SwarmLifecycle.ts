import RAPIER from "@dimforge/rapier3d-compat";
import {
  MAX_DRONES,
  ServerDrone,
  ServerCamera,
  PlayerState,
  createMemoryMap,
} from "./types";
import {
  DroneState,
  DroneType,
  DRONE_CONFIGS,
  ZONES,
  ZONE_BOUNDS,
  PLAYER_CENTER_OFFSET,
} from "../../shared/constants";
import { recordDroneColliderInit } from "../sentry";
import { benchmarkCounter } from "../benchmark/telemetry";

export interface SwarmLifecycleContext {
  getRapierWorld: () => RAPIER.World | null;
  getColliderToEntityMap: () => Map<
    number,
    { type: "player"; obj: PlayerState } | { type: "drone"; obj: ServerDrone }
  >;
  getMapId: () => string;
  getSpecJson: () => any;
  getCommanderMemory: () => any;
  broadcastReliableEvent: (evt: any) => void;
}

export class SwarmLifecycle {
  public drones: ServerDrone[] = [];
  public cameras: ServerCamera[] = [];
  public nextDroneId = 1;
  private spawnIndexMap: { [type: string]: number } = {
    AIR_HANGAR: 0,
    GROUND_GARAGE: 0,
    ELEVATOR_SHAFT: 0,
  };

  constructor(private context: SwarmLifecycleContext) {
    this.initDronePool();
  }

  private initDronePool(): void {
    this.drones = new Array(MAX_DRONES).fill(null).map((_, i) => ({
      id: i + 1,
      type: DroneType.WHEELED,
      state: DroneState.DEAD,
      mode: "NORMAL",
      currentVelocityX: 0,
      currentVelocityY: 0,
      currentVelocityZ: 0,
      currentHeadingX: 1,
      currentHeadingZ: 0,
      memoryRecords: createMemoryMap(),
      combatTarget: null,
      bomberState: "SEEKING",
      behavior: "patrol",
      zone: ZONES.CORE,
      posX: 0,
      posY: -999,
      posZ: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      rotW: 1,
      velX: 0,
      velY: 0,
      velZ: 0,
      playerInFOV: false,
      rad: 1.0,
      hp: 100,
      groupId: "",
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      path: [],
      pathIndex: 0,
      cooldown: 0,
      damageLog: [],
      body: null,
      collider: null,
      kcc: null,
      posture: null,
      humanoidPose: "stand_run",
      peekCooldown: 0,
      lastDamageTick: -9999,
      gearActionId: 0,
      gearActionScore: 0,
      gearLastPosture: "",
      fixedWingPhase: "APPROACH",
      humanoidPhase: "HUNT",
      cachedCoverPos: { x: 0, y: 0, z: 0 },
      coverCacheTick: 0,
      targetLastPos: { x: 0, y: 0, z: 0 },
      targetLastMoveTick: 0,
      suppressToggle: false,
      investigateHoldTick: 0,
      parkedOrder: {
        type: "move",
        targetZone: ZONES.CORE,
        path: [],
        pathIndex: 0,
        active: false,
      },
      strafeRunTarget: null,
      avoidanceState: null,
      stuckTicks: 0,
    }));
  }

  public initCameras(): void {
    const spec = this.context.getSpecJson();
    if (spec && spec.cameras && spec.cameras.length > 0) {
      this.cameras = spec.cameras.map((c: any) => ({
        id: c.id,
        posX: c.position.x,
        posY: c.position.y,
        posZ: c.position.z,
        rotY: c.yaw || 0,
        detectionRadius: c.detectionRadius || 25,
        isActive: true,
        hp: c.hp || 50,
        cooldown: 0,
      }));
    } else {
      this.cameras = [
        {
          id: 1,
          posX: -20,
          posY: 3,
          posZ: -30,
          rotY: 0,
          detectionRadius: 25,
          isActive: true,
          hp: 50,
          cooldown: 0,
        },
        {
          id: 2,
          posX: 0,
          posY: 4,
          posZ: 0,
          rotY: 0,
          detectionRadius: 25,
          isActive: true,
          hp: 50,
          cooldown: 0,
        },
        {
          id: 3,
          posX: 25,
          posY: 5,
          posZ: 10,
          rotY: 0,
          detectionRadius: 25,
          isActive: true,
          hp: 50,
          cooldown: 0,
        },
        {
          id: 4,
          posX: 0,
          posY: 6,
          posZ: 30,
          rotY: 0,
          detectionRadius: 25,
          isActive: true,
          hp: 50,
          cooldown: 0,
        },
        {
          id: 5,
          posX: -25,
          posY: 3,
          posZ: 15,
          rotY: 0,
          detectionRadius: 25,
          isActive: true,
          hp: 50,
          cooldown: 0,
        },
      ];
    }
  }

  public getNextSpawnPoint(
    type: string
  ): { x: number; y: number; z: number } | null {
    const spec = this.context.getSpecJson();
    if (!spec?.droneSpawnPoints) return null;
    const points = spec.droneSpawnPoints.filter((p: any) => p.type === type);
    if (!points || points.length === 0) return null;

    const idx = (this.spawnIndexMap[type] || 0) % points.length;
    this.spawnIndexMap[type] = idx + 1;
    return points[idx].position;
  }

  public initDronePhysics(d: ServerDrone): void {
    const rapierWorld = this.context.getRapierWorld();
    if (!rapierWorld) return;

    try {
      const config = DRONE_CONFIGS[d.type];
      if (!config) return;

      d.rad = config.collider.halfExtents[0];

      const bodyDesc =
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
          d.posX,
          d.posY,
          d.posZ
        );
      d.body = rapierWorld.createRigidBody(bodyDesc);

      let colliderDesc: RAPIER.ColliderDesc;
      if (config.collider.type === "ball") {
        colliderDesc = RAPIER.ColliderDesc.ball(config.collider.halfExtents[0]);
      } else if (config.collider.type === "capsule") {
        colliderDesc = RAPIER.ColliderDesc.capsule(
          config.collider.halfExtents[0],
          config.collider.halfExtents[1]
        );
      } else {
        colliderDesc = RAPIER.ColliderDesc.cuboid(
          config.collider.halfExtents[0],
          config.collider.halfExtents[1],
          config.collider.halfExtents[2]
        );
      }

      d.collider = rapierWorld.createCollider(colliderDesc, d.body);
      this.context.getColliderToEntityMap().set(d.collider.handle, {
        type: "drone",
        obj: d,
      });

      if (config.collider.offset) {
        d.collider.setTranslationWrtParent({
          x: config.collider.offset[0],
          y: config.collider.offset[1],
          z: config.collider.offset[2],
        });
      }

      if (d.type === DroneType.ROBOT_DOG) {
        recordDroneColliderInit(d.type, {
          id: d.id,
          posX: d.posX,
          posY: d.posY,
          posZ: d.posZ,
          colliderType: config.collider.type,
          halfExtents: config.collider.halfExtents,
          rad: d.rad,
          hasCollider: !!d.collider,
        });
      }

      const offset = 0.1;
      d.kcc = rapierWorld.createCharacterController(offset);
      d.kcc.setUp({ x: 0, y: 1, z: 0 });
      d.kcc.setApplyImpulsesToDynamicBodies(true);

      if (d.type === DroneType.BOMBER || d.type === DroneType.ROTARY_SHOOTER) {
        d.currentVelocity = { x: 0, y: 0, z: 0 };
      } else if (
        d.type === DroneType.FIXED_WING ||
        d.type === DroneType.RECON
      ) {
        d.currentHeading = { x: 1, y: 0, z: 0 };
        d.currentSpeed = 0;
      }
    } catch (e) {}
  }

  public despawnDrone(d: ServerDrone): void {
    const oldState = d.state;
    d.state = DroneState.DEAD;
    const commanderMemory = this.context.getCommanderMemory();
    if (oldState !== DroneState.DEAD && commanderMemory) {
      commanderMemory.onDroneDespawned(d);
    }
    if (oldState !== DroneState.DEAD) {
      this.context.broadcastReliableEvent({
        type: "DRONE_DEATH",
        droneId: d.id,
        posX: d.posX,
        posY: d.posY,
        posZ: d.posZ,
      });
    }
    if (d.collider) {
      this.context.getColliderToEntityMap().delete(d.collider.handle);
    }
    if (d.body) {
      try {
        const rapierWorld = this.context.getRapierWorld();
        if (rapierWorld) {
          rapierWorld.removeRigidBody(d.body);
        }
      } catch (e) {
        console.error("[VEXEA SERVER] Error removing drone rigid body:", e);
      }
      d.body = null;
    }
    d.collider = null;
  }

  public resetDroneToDefaults(d: ServerDrone): void {
    d.mode = "NORMAL";
    d.combatTarget = null;
    d.memoryRecords = createMemoryMap();
    d.posture = null;
    d.bomberState = "SEEKING";
    d.bomberLockTime = undefined;
    d.gearActionId = 0;
    d.gearActionScore = 0;
    d.gearLastPosture = "";
    d.playerInFOV = false;
    d.targetX = 0;
    d.targetY = 0;
    d.targetZ = 0;
    d.path = [];
    d.pathIndex = 0;
    d.cooldown = 0;
    d.damageLog = [];
    d.lastDamageTick = -9999;
    d.fixedWingPhase = "APPROACH";
    d.humanoidPhase = "HUNT";
    d.humanoidPose = "stand_run";
    d.cachedCoverPos = { x: 0, y: 0, z: 0 };
    d.coverCacheTick = 0;
    d.targetLastPos = { x: 0, y: 0, z: 0 };
    d.targetLastMoveTick = 0;
    d.suppressToggle = false;
    d.investigateHoldTick = 0;
    d.flankStartTick = undefined;
    d.peekCooldown = 0;
    d.parkedOrder = {
      type: "move",
      targetZone: ZONES.CORE,
      path: [],
      pathIndex: 0,
      active: false,
    };
    d.strafeRunTarget = null;
    d.avoidanceState = null;
    d.stuckTicks = 0;
    d.currentVelocityX = 0;
    d.currentVelocityY = 0;
    d.currentVelocityZ = 0;
    d.currentHeadingX = 1;
    d.currentHeadingZ = 0;
    d.velX = 0;
    d.velY = 0;
    d.velZ = 0;
    d.rotX = 0;
    d.rotY = 0;
    d.rotZ = 0;
    d.rotW = 1;
    d.currentVelocity = undefined;
    d.currentHeading = undefined;
    d.currentSpeed = 0;
    (d as any).history = [];
    (d as any).cachedObstacleDetected = false;
    (d as any).cachedForwardHitDistance = 0;
    (d as any).isFrozen = false;
  }

  public registerDeveloperSpawner(
    type: number,
    pos?: { x: number; y: number; z: number }
  ): boolean {
    let spawned = false;
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.state === DroneState.DEAD) {
        this.resetDroneToDefaults(d);
        d.id = this.nextDroneId++;
        d.type = type;
        d.state = DroneState.IDLE;
        d.zone = ZONES.COURTYARD;
        const isAir =
          d.type === DroneType.ROTARY_SHOOTER ||
          d.type === DroneType.BOMBER ||
          d.type === DroneType.RECON ||
          d.type === DroneType.FIXED_WING;

        if (pos) {
          d.posX = pos.x;
          d.posY = pos.y;
          d.posZ = pos.z;
        } else {
          const spawnType = isAir ? "AIR_HANGAR" : "GROUND_GARAGE";
          let spawnPos =
            this.context.getMapId() === "map_1_facility"
              ? this.getNextSpawnPoint(spawnType)
              : null;
          if (spawnPos) {
            d.posX = spawnPos.x;
            d.posY = spawnPos.y;
            d.posZ = spawnPos.z;
          } else {
            const b = ZONE_BOUNDS[ZONES.COURTYARD];
            d.posX = b.center.x + (Math.random() - 0.5) * b.halfSize.x * 0.4;
            d.posY = isAir ? b.center.y + 4 : b.center.y + PLAYER_CENTER_OFFSET;
            d.posZ = b.center.z + (Math.random() - 0.5) * b.halfSize.z * 0.4;
          }
        }
        d.hp = DRONE_CONFIGS[d.type]?.hp ?? 100;
        d.groupId = "G_DEV";
        d.cooldown = 40;
        this.initDronePhysics(d);
        benchmarkCounter("drones.spawned");

        spawned = true;
        this.context.broadcastReliableEvent({
          type: "group_spawned",
          zone: ZONES.COURTYARD,
          count: 1,
          groupId: d.groupId,
        });
        break;
      }
    }
    return spawned;
  }
}
