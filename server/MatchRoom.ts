/**
 * ARCHITECTURAL WARNING:
 * This match room is a monolith that defies the rules of architecture.md.
 * The lobby will be removed.
 * If incoming changes require deep structural modifications, this file will be restructured
 * and hacked into separate parts to maintain manageability.
 */

import { processDroneIntelligence, MemoryRecord } from "./ai/DroneIntelligence";
import { processDroneBehaviors, initBehaviorOutputs } from "./ai/behavior/DroneBehaviorController";
import { calculateDroneAvoidance } from "./ai/DroneAvoidance";
import { CommanderMemory } from "./ai/CommanderMemory";
import { GroupTacticalState, Posture } from "./ai/GroupTacticalState";
import { GoogleGenAI, Type } from "@google/genai";
import RAPIER from "@dimforge/rapier3d-compat";
import { ACTIVE_GAMEMODE } from "../shared/gamemode-configs.js";
import { DEFAULT_SHARED_FEATURE_FLAGS, SharedFeatureFlagKey } from "../shared/feature-flags";
import {
  HEADER_SIZE,
  DRONE_STRUCT_SIZE,
  CAMERA_STRUCT_SIZE,
  MAX_DRONES,
  TOTAL_STATE_BUFFER_SIZE,
  ZONES,
  TOPOLOGY,
  ZONE_BOUNDS,
  DroneState,
  DroneType,
  WEAPONS,
  ZoneName,
  WAYPOINTS,
  ZONES_ARRAY,
  BehaviorProfile,
  DRONE_CONFIGS,
  TOTAL_STATE_BUFFER_SIZE as CONST_BUFFER_SIZE,
  PLAYER_CENTER_OFFSET,
  PLAYER_TOTAL_HEIGHT,
  PLAYER_CAPSULE_HALF_HEIGHT,
  PLAYER_CAPSULE_HALF_HEIGHT_CROUCH,
  PLAYER_BASE_SPEED,
  PLAYER_CROUCH_SPEED,
  PLAYER_SPRINT_MULTIPLIER,
  PLAYER_DASH_MULTIPLIER,
  PLAYER_JUMP_VELOCITY,
  PLAYER_GRAVITY,
  CAMERA_MAX_HP,
  PLAYER_MAX_HP,
  PLAYER_RESPAWN_DELAY_DEFAULT,
  getDroneMuzzleWorldPosition,
  INTEL_CONFIGS,
  DroneIntelConfig
} from "../shared/constants";
import { ChannelAdapter } from "./transport/adapter";
import { CLASSES, ClassId } from "../shared/classes.js";
import {
  createInitialUtilityState,
  PlayerUtilityState,
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
} from "../shared/utilities";
import { getMapById } from "../shared/maps/map-registry";
import { ZoneRegistry } from "./map/ZoneRegistry";
import { OutOfBoundsEnforcer } from "./map/OutOfBoundsEnforcer";
import { CollisionSystem } from "../shared/collision";
import * as fs from "fs";
import * as path from "path";
import {
  db,
  doc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  runTransaction,
  globalChannels,
  globalServerLogs,
} from "./index";
import { Sentry, recordServerTickDuration, recordServerActiveDrones, recordServerConnectedPlayers, recordSecurityExploit, recordDroneColliderInit } from "./sentry";
import { archiveMatchEvent } from "./player-data/MatchEventCollector";
import { PlayerProfileStore } from "./player-data/PlayerProfileStore";
import { MatchAbuseStore } from "./player-data/MatchAbuseStore";

export const MAX_PROJECTILES = 200;

export interface PlayerState {
  id: string;
  reqUid?: string;
  displayName?: string;
  channel: ChannelAdapter;
  kcc: RAPIER.KinematicCharacterController | null;
  body: RAPIER.RigidBody | null;
  collider: RAPIER.Collider | null;
  isReady?: boolean;
  isBot?: boolean;
  abandonedMatch?: boolean;
  disconnectTimer?: any;

  inputMask: number;
  fire: number;
  timestamp: number;

  posX: number;
  posY: number;
  posZ: number;
  velX: number;
  velY: number;
  velZ: number;
  pitch: number;
  yaw: number;
  hp: number;
  score: number;
  classId?: ClassId;
  weapon?: string;
  weaponState: {
    primary: {
      currentMag: number;
      reserve: number;
      isReloading: boolean;
      reloadTimer: number;
      fireMode: "auto" | "burst";
      lastConfirmedShotT: number;
      leakyBucket: number;
    };
    secondary: {
      currentMag: number;
      reserve: number;
      isReloading: boolean;
      reloadTimer: number;
      fireMode: "auto" | "burst";
      lastConfirmedShotT: number;
      leakyBucket: number;
    };
  };
  utilityState?: PlayerUtilityState;
  ping: number;
  lastSequence: number;
  leakyRateLimit: number;
  lastFireTime: number;

  velEmaX: number;
  velEmaY: number;
  velEmaZ: number;
  adMultiplier?: number;
  firedThisTick?: boolean;
  godMode?: boolean;
  infiniteAmmo?: boolean;
  isHoldingObjective?: boolean;
  currentObjectiveProgress?: number;
  signalDisruptorUntil?: number;

  maxHp: number;
  isAlive: boolean;
  isDead: boolean;
  respawnTimer: number;
  lastDamageSource: {
    type: "bullet" | "explosion" | "fall" | "melee";
    entityId: string;
    entityType: "drone" | "environment" | "player";
  };
  deathPosition: { x: number; y: number; z: number };
  stats: {
    damageDealt: number;
    damageReceived: number;
    deaths: number;
    droneEliminations: number;
    assists: number;
    objectiveTimeHeld: number;
    revivesPerformed: number;
    distanceTravelled: number;
    timeAlive: number;
    scoreIndividual: number;
  };
  lastFallStartY: number;
}

export interface ServerDrone {
  id: number;
  type: DroneType;
  state: DroneState; // This now acts as the Task
  mode: "NORMAL" | "COMBAT";
  currentVelocityX: number;
  currentVelocityY: number;
  currentVelocityZ: number;
  currentHeadingX: number;
  currentHeadingZ: number;
  memoryRecords: Map<string, MemoryRecord>;
  combatTarget?: any | null;
  bomberState?: "SEEKING" | "LOCKED" | "COMMITTED";
  bomberLockTime?: number;
  behavior: BehaviorProfile;
  zone: ZoneName;
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  rotW: number;
  velX: number;
  velY: number;
  velZ: number;
  playerInFOV?: boolean;
  rad: number;
  hp: number;
  groupId: string;
  targetX: number;
  targetY: number;
  targetZ: number;
  path: ZoneName[];
  pathIndex: number;
  cooldown: number;
  damageLog: { playerId: string; timestamp: number }[];
  body?: RAPIER.RigidBody | null;
  collider?: RAPIER.Collider | null;
  kcc?: RAPIER.KinematicCharacterController | null;
  currentVelocity?: { x: number; y: number; z: number };
  currentHeading?: { x: number; y: number; z: number };
  currentSpeed?: number;
  avoidanceState?: { active: boolean; direction: number; ticksRemaining: number; transitioning?: boolean; transitionX?: number; transitionZ?: number; } | null;
  stuckTicks?: number;
  fixedWingPhase?: 'APPROACH' | 'RUN' | 'EXIT' | 'REPOSITION';
  humanoidPhase?: string;
  cachedCoverPos: { x: number; y: number; z: number };
  coverCacheTick?: number;
  targetLastPos: { x: number; y: number; z: number };
  targetLastMoveTick?: number;
  suppressToggle?: boolean;
  investigateHoldTick?: number;
  flankStartTick?: number;
  posture: Posture | null;
  humanoidPose: string;
  peekCooldown: number;
  lastDamageTick: number;
  parkedOrder: { type: "move" | "hold"; targetZone: ZoneName; path: ZoneName[]; pathIndex: number; active: boolean };
  strafeRunTarget?: ZoneName | null;
}

export interface ServerCamera {
  id: number;
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
  isActive: boolean;
  hp: number;
  detectionRadius: number;
  cooldown: number;
  disabledUntil?: number;
}

export interface ServerZoneState {
  id: string;
  name: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  connectedZones: string[];
  droneGroups: string[];
  confidence: number;
  lastSeenTimestamp: number;
  activeOperations: { type: string; eta: number; progress: number }[];
  combatEffectiveness: "full" | "degraded" | "critical" | "destroyed";
  droneSpawnEnabled: boolean;
  allowsAirUnits: boolean;
}

const HISTORICAL_SAMPLES_MAX = 120;
const BASE_DETECTION_DISTANCE = 3.0;
const DETECTION_TIME_HORIZON = 0.5;
const MIN_AVOIDANCE_TICKS = 30;
const HISTORIC_BLOCK_SIZE = 2 + MAX_DRONES * 4;
const DEBUG_PHYSICS_TICKS = false;

export const astarPath = (start: ZoneName, end: ZoneName): ZoneName[] => {
  if (start === end) return [start];

  const queue: ZoneName[][] = [[start]];
  const visited = new Set<ZoneName>([start]);

  while (queue.length > 0) {
    const currentPath = queue.shift()!;
    const lastNode = currentPath[currentPath.length - 1];
    if (lastNode === end) return currentPath;

    const neighbors = TOPOLOGY[lastNode];
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...currentPath, neighbor]);
      }
    }
  }
  return [start];
};

import { LLMCommander } from "./ai/LLMCommander";
import { PhysicsWorldManager } from "./physics/PhysicsWorldManager";

export class MatchRoom {
  public roomId: string;
  public players: Map<string, PlayerState> = new Map();
  private abandonedPlayerIds: Set<string> = new Set();
  private colliderToEntityMap: Map<number, { type: "player"; obj: PlayerState } | { type: "drone"; obj: ServerDrone }> = new Map();
  public drones: ServerDrone[] = [];
  public nextDroneId = 1;
  public serverTick = 0;
  public matchActive = false;
  public matchStartTime = 0;
  public cameras: ServerCamera[] = [];
  public apiCallCount = 0;
  public llmTokensUsedThisMatch = 0;
  public commanderAP: number = ACTIVE_GAMEMODE.llmApStartPool;
  public fixedWingDeploymentsThisMatch: number = 0;
  public groupTacticalState: GroupTacticalState = new GroupTacticalState();
  public outstandingOrders: Map<string, { targetZone: ZoneName; cyclesOutstanding: number; holdRemainingCycles?: number }> = new Map();
  public failedOperations: string[] = [];
  public zoneSummary!: Record<ZoneName, ServerZoneState>;

  // Debug Cube Fields
  public devCubeBody: RAPIER.RigidBody | null = null;
  public devCubeCollider: RAPIER.Collider | null = null;
  public devCubeEvents: string[] = [];
  public devCubePrevState: "air" | "ground" | "none" = "none";
  public devCubeSpawned = false;

  // Dev Physics Settings
  public devPhysicsGravityY = -9.81;
  public devPhysicsSpeedMultiplier = 1.0;
  public devPhysicsPaused = false;
  public devPhysicsStepOnceRequested = false;

  // Projectiles Pool
  public projActive = new Uint8Array(200);
  public projPosX = new Float32Array(200);
  public projPosY = new Float32Array(200);
  public projPosZ = new Float32Array(200);
  public projVelX = new Float32Array(200);
  public projVelY = new Float32Array(200);
  public projVelZ = new Float32Array(200);
  public projDamage = new Float32Array(200);
  public projDist = new Float32Array(200);
  public projEnemy = new Uint8Array(200);
  public projSourceId: string[] = new Array(200).fill("");

  // History verification buffer (Zero-GC)
  public historicalAABBHistory = new Float32Array(
    HISTORICAL_SAMPLES_MAX * HISTORIC_BLOCK_SIZE,
  );
  public historicalAABBIndex = 0;

  // Rapier Physics
  public rapierWorld!: RAPIER.World;
  public physicsManager!: PhysicsWorldManager;

  public llmCommander: LLMCommander | null = null;
  public commanderMemory: CommanderMemory;
  public aiCommanderActive = false;
  public llmCommanderDisabled = false;
  public lastLLMToolCall: string | null = null;
  public activeC4Map: Map<string, { x: number; y: number; z: number }> = new Map();
  public proximityMines: { id: string; ownerId: string; x: number; y: number; z: number; triggered: boolean }[] = [];

  // Sockets pre-allocated pack write buffers
  private preallocatedBuffer = new ArrayBuffer(TOTAL_STATE_BUFFER_SIZE);
  private payloadWriter = new DataView(this.preallocatedBuffer);
  private playerSyncBuffer = new ArrayBuffer(20);
  private playerSyncView = new DataView(this.playerSyncBuffer);

  // Interval handlers
  private physicsInterval: any = null;
  private syncInterval: any = null;
  private aiInterval: any = null;
  private isShutdown = false;

  public mapId: string;
  public zoneRegistry: ZoneRegistry | null = null;
  public outOfBoundsEnforcer: OutOfBoundsEnforcer = new OutOfBoundsEnforcer();
  public collisionMap: CollisionSystem | null = null;
  public specJson: any = null;
  public onShutdown?: (roomId: string) => void;

  private airHangarIndex = 0;
  private groundGarageIndex = 0;
  private elevatorShaftIndex = 0;

  public getNextSpawnPoint(
    spawnType: "AIR_HANGAR" | "GROUND_GARAGE" | "ELEVATOR_SHAFT",
  ): { x: number; y: number; z: number } | null {
    if (!this.specJson || !this.specJson.spawnPoints) return null;
    const pts = this.specJson.spawnPoints.filter(
      (p: any) => p.type === spawnType,
    );
    if (pts.length === 0) return null;

    let index = 0;
    if (spawnType === "AIR_HANGAR") {
      index = this.airHangarIndex % pts.length;
      this.airHangarIndex++;
    } else if (spawnType === "GROUND_GARAGE") {
      index = this.groundGarageIndex % pts.length;
      this.groundGarageIndex++;
    } else if (spawnType === "ELEVATOR_SHAFT") {
      index = this.elevatorShaftIndex % pts.length;
      this.elevatorShaftIndex++;
    }

    return pts[index].position;
  }

  constructor(roomId: string, geminiKey?: string, mapId = "map_1_facility") {
    this.roomId = roomId;
    this.mapId = mapId;
    this.initMapConfig();
    this.physicsManager = new PhysicsWorldManager(this.specJson);
    this.physicsManager.initPhysics();
    this.rapierWorld = this.physicsManager.rapierWorld;
    this.initEntities();
    this.commanderMemory = new CommanderMemory(this);
    this.llmCommander = new LLMCommander(this, geminiKey);
    // Phase 1 complete. Simulation loops start in triggerStartMatch()
  }

  private initMapConfig() {
    const mapDef = getMapById(this.mapId);
    if (mapDef && mapDef.specFile) {
      try {
        const absolutePath = path.join(process.cwd(), mapDef.specFile);
        // console.log('[COLLISION DEBUG] Loading spec from:', absolutePath);
        const specJson = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
        this.specJson = specJson;
        this.zoneRegistry = new ZoneRegistry();
        this.zoneRegistry.loadFromSpec(specJson);
        this.collisionMap = new CollisionSystem();
        this.collisionMap.loadFromSpec(specJson);
        // console.log('[COLLISION DEBUG] Loaded box count:', this.collisionMap.boxes.length);
        // if (this.collisionMap.boxes.length > 0) {
        //   console.log('[COLLISION DEBUG] First box:', JSON.stringify(this.collisionMap.boxes[0]));
        // }

        if (specJson.spawnPoints) {
          console.log("[MATCH ROOM] Registered spawn points from spec");
        }
      } catch (e) {
        console.error("[MATCH ROOM] failed to load map spec", e);
      }
    }
  }

  private initEntities() {
    initBehaviorOutputs(MAX_DRONES);
    // Populate drone structures preallocated pool
    for (let i = 0; i < MAX_DRONES; i++) {
      const memorySlots = [];
      for (let j = 0; j < 10; j++) {
        memorySlots.push({
          playerId: "",
          posX: 0,
          posY: 0,
          posZ: 0,
          confidence: 0,
          lastUpdated: 0
        });
      }

      this.drones.push({
        id: 0,
        type: DroneType.WHEELED,
        state: DroneState.DEAD,
        mode: "NORMAL",
        currentVelocityX: 0,
        currentVelocityY: 0,
        currentVelocityZ: 0,
        currentHeadingX: 1,
        currentHeadingZ: 0,
        memoryRecords: new Map(),
        combatTarget: null,
        // memory: memorySlots, removed for custom memory
        behavior: "patrol",
        zone: ZONES.CORE,
        posX: 0,
        posY: 0,
        posZ: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        rotW: 1,
        velX: 0,
        velY: 0,
        velZ: 0,
        rad: 1.2,
        hp: 100,
        groupId: "G_ALPHA",
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        path: [],
        pathIndex: 0,
        cooldown: 0,
        damageLog: [],
        body: null,
        collider: null,
        fixedWingPhase: 'APPROACH',
        humanoidPhase: 'HUNT',
        cachedCoverPos: { x: 0, y: 0, z: 0 },
        coverCacheTick: 0,
        targetLastPos: { x: 0, y: 0, z: 0 },
        targetLastMoveTick: 0,
        suppressToggle: false,
        investigateHoldTick: 0,
        posture: null,
        humanoidPose: "stand_run",
        peekCooldown: 0,
        lastDamageTick: -9999,
        parkedOrder: { type: "move" as "move" | "hold", targetZone: ZONES.CORE, path: [] as ZoneName[], pathIndex: 0, active: false },
        strafeRunTarget: null,
      });
    }

    // Initialize cameras
    for (let i = 0; i < 20; i++) {
      this.cameras.push({
        id: i,
        posX: 0,
        posY: 5,
        posZ: 0,
        rotY: 0,
        isActive: false,
        hp: 0,
        detectionRadius: 30,
        cooldown: 0,
      });
    }
    for (let i = 0; i < ZONES_ARRAY.length; i++) {
      this.cameras[i].isActive = true;
      this.cameras[i].hp = CAMERA_MAX_HP;
      this.cameras[i].posX = WAYPOINTS[ZONES_ARRAY[i]].x;
      this.cameras[i].posY = 8;
      this.cameras[i].posZ = WAYPOINTS[ZONES_ARRAY[i]].z;
    }

    // Default zone summaries structures
    this.zoneSummary = {
      [ZONES.SPAWN]: {
        id: ZONES.SPAWN,
        name: "zone_spawn",
        bounds: { minX: 0, maxX: 128, minZ: 640, maxZ: 768 },
        connectedZones: [ZONES.COURTYARD],
        droneGroups: [],
        confidence: 0.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: false,
        allowsAirUnits: false,
      },
      [ZONES.COURTYARD]: {
        id: ZONES.COURTYARD,
        name: "zone_courtyard",
        bounds: { minX: 0, maxX: 288, minZ: 352, maxZ: 640 },
        connectedZones: [ZONES.SPAWN, ZONES.WAREHOUSE, ZONES.BRIDGE],
        droneGroups: [],
        confidence: 0.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: true,
      },
      [ZONES.WAREHOUSE]: {
        id: ZONES.WAREHOUSE,
        name: "zone_warehouse",
        bounds: { minX: 0, maxX: 288, minZ: 128, maxZ: 352 },
        connectedZones: [ZONES.COURTYARD, ZONES.TUNNELS, ZONES.PLANT],
        droneGroups: [],
        confidence: 0.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: false,
      },
      [ZONES.BRIDGE]: {
        id: ZONES.BRIDGE,
        name: "zone_bridge",
        bounds: { minX: 248, maxX: 328, minZ: 456, maxZ: 536 },
        connectedZones: [ZONES.COURTYARD, ZONES.PLANT],
        droneGroups: [],
        confidence: 0.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: false,
        allowsAirUnits: true,
      },
      [ZONES.PLANT]: {
        id: ZONES.PLANT,
        name: "zone_plant",
        bounds: { minX: 288, maxX: 768, minZ: 128, maxZ: 768 },
        connectedZones: [ZONES.WAREHOUSE, ZONES.BRIDGE, ZONES.CORE],
        droneGroups: [],
        confidence: 0.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: true,
      },
      [ZONES.TUNNELS]: {
        id: ZONES.TUNNELS,
        name: "zone_tunnels",
        bounds: { minX: 128, maxX: 768, minZ: 0, maxZ: 128 },
        connectedZones: [ZONES.WAREHOUSE, ZONES.CORE],
        droneGroups: [],
        confidence: 0.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: false,
        allowsAirUnits: false,
      },
      [ZONES.CORE]: {
        id: ZONES.CORE,
        name: "zone_core",
        bounds: { minX: 320, maxX: 448, minZ: 320, maxZ: 448 },
        connectedZones: [ZONES.PLANT, ZONES.TUNNELS],
        droneGroups: [],
        confidence: 0.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: false,
        allowsAirUnits: false,
      },
    };
  }

  public initDronePhysics(d: ServerDrone) {
    if (!this.rapierWorld) return;
    try {
      if (d.body) {
        this.rapierWorld.removeRigidBody(d.body);
      }
      const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(d.posX, d.posY, d.posZ);
      d.body = this.rapierWorld.createRigidBody(bodyDesc);
      let colliderDesc: RAPIER.ColliderDesc;
      const config = DRONE_CONFIGS[d.type] || DRONE_CONFIGS[DroneType.TEST_ENTITY];
      if (config.collider.type === 'cuboid' && config.collider.halfExtents) {
        colliderDesc = RAPIER.ColliderDesc.cuboid(config.collider.halfExtents[0], config.collider.halfExtents[1], config.collider.halfExtents[2]);
        // Set rad to the maximum half-extent to cover the box for the sphere-check fallback
        d.rad = Math.max(config.collider.halfExtents[0], config.collider.halfExtents[1], config.collider.halfExtents[2]);
      } else if (config.collider.type === 'capsule' && config.collider.halfHeight !== undefined && config.collider.radius !== undefined) {
        colliderDesc = RAPIER.ColliderDesc.capsule(config.collider.halfHeight, config.collider.radius);
        d.rad = config.collider.halfHeight + config.collider.radius;
      } else {
        d.rad = config.collider.radius || 1.5;
        colliderDesc = RAPIER.ColliderDesc.ball(d.rad);
      }
      
      d.collider = this.rapierWorld.createCollider(colliderDesc, d.body);
      this.colliderToEntityMap.set(d.collider.handle, { type: "drone", obj: d });
      if (config.collider.offset) {
        d.collider.setTranslationWrtParent({ x: config.collider.offset[0], y: config.collider.offset[1], z: config.collider.offset[2] });
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
      d.kcc = this.rapierWorld.createCharacterController(offset);
      d.kcc.setUp({ x: 0, y: 1, z: 0 });
      d.kcc.setApplyImpulsesToDynamicBodies(true);

      if (d.type === DroneType.BOMBER || d.type === DroneType.ROTARY_SHOOTER) {
        d.currentVelocity = { x: 0, y: 0, z: 0 };
      } else if (d.type === DroneType.FIXED_WING || d.type === DroneType.RECON) {
        d.currentHeading = { x: 1, y: 0, z: 0 };
        d.currentSpeed = 0;
      }
      
      // console.log('[COLLIDE_DIAG] Drone collider created. droneId:', d.id, 'colliderHandle:', d.collider.handle, 'collisionGroups:', d.collider.collisionGroups(), 'solverGroups:', d.collider.solverGroups(), 'isSensor:', d.collider.isSensor(), 'shape:', JSON.stringify(colliderDesc.shape));
    } catch (e) {}
  }

  public despawnDrone(d: ServerDrone) {
    const oldState = d.state;
    d.state = DroneState.DEAD;
    if (oldState !== DroneState.DEAD && this.commanderMemory) {
      this.commanderMemory.onDroneDespawned(d);
    }
    if (oldState !== DroneState.DEAD) {
      this.broadcastReliableEvent({
        type: "DRONE_DEATH",
        droneId: d.id,
        posX: d.posX,
        posY: d.posY,
        posZ: d.posZ,
      });
    }
    if (d.collider) {
      this.colliderToEntityMap.delete(d.collider.handle);
    }
    if (d.body) {
      try {
        if (this.rapierWorld) {
          this.rapierWorld.removeRigidBody(d.body);
        }
      } catch (e) {
        console.error("[VEXEA SERVER] Error removing drone rigid body:", e);
      }
      d.body = null;
    }
    d.collider = null;
  }

  public findHitEntity(colliderHandle: number): { type: "player", obj: PlayerState } | { type: "drone", obj: ServerDrone } | null {
    return this.colliderToEntityMap.get(colliderHandle) || null;
  }



  public applyPlayerClassLoadout(pStateOrId: PlayerState | string, classId: ClassId): void {
    const pState = typeof pStateOrId === 'string' ? this.players.get(pStateOrId) : pStateOrId;
    if (!pState) return;
    const classDef = CLASSES[classId] || CLASSES.ASSAULT;

    pState.classId = classDef.id;
    pState.weapon = classDef.primaryWeapon.toLowerCase();
    pState.hp = 100;
    pState.maxHp = PLAYER_MAX_HP;
    pState.utilityState = createInitialUtilityState(classDef.id, ACTIVE_GAMEMODE.utilityCooldownMultiplier);
    pState.channel.emit("reliable_event", {
      type: "UTILITY_STATE",
      state: pState.utilityState,
    });
    console.log(`[MATCH] Applied class ${classDef.id} loadout to player ${pState.id}: Primary=${classDef.primaryWeapon}, Secondary=${classDef.secondaryWeapon}, Utility1=${classDef.utility1}, Utility2=${classDef.utility2}`);
  }

  public registerPlayer(
    playerId: string,
    channel: ChannelAdapter,
    stats: any,
    playerClass?: ClassId,
    displayName?: string,
    reqUid?: string
  ): PlayerState {
    console.log(`[SERVER registerPlayer] playerId: "${playerId}", displayName: "${displayName || playerId}", mapId: "${this.mapId}", class: "${playerClass || 'ASSAULT'}"`);

    // Handle Reconnection: If player already exists, rebind channel and return state
    if (this.players.has(playerId)) {
      const existing = this.players.get(playerId)!;
      this.handlePlayerReconnect(playerId, channel);
      if (reqUid) existing.reqUid = reqUid;
      if (displayName) existing.displayName = displayName;
      if (playerClass && CLASSES[playerClass]) {
        this.applyPlayerClassLoadout(existing, playerClass);
      }
      console.log(`[MATCH] Player ${playerId} reconnected. Rebinding to existing session state at [${existing.posX.toFixed(2)}, ${existing.posY.toFixed(2)}, ${existing.posZ.toFixed(2)}]`);
      
      // Force an immediate handshake to the client with the current state
      channel.emit("handshake", {
        id: existing.id,
        mapId: this.mapId,
        posX: existing.posX,
        posY: existing.posY,
        posZ: existing.posZ,
        hp: existing.hp,
        weapon: existing.weapon,
        classId: existing.classId,
        stats: existing.stats
      });
      
      return existing;
    }
    
    // Deterministic Spawning Phase 1/2: Resolve coordinates from map data
    const spawnX = this.specJson?.playerSpawn?.position?.x ?? ((Math.random() - 0.5) * 40);
    const spawnY = (this.specJson?.playerSpawn?.position?.y ?? 0) + 5.0;
    const spawnZ = this.specJson?.playerSpawn?.position?.z ?? (120 + (Math.random() - 0.5) * 10);

    const chosenClassId: ClassId = (playerClass && CLASSES[playerClass]) ? playerClass : 'ASSAULT';
    const classDef = CLASSES[chosenClassId];

    const pState: PlayerState = {
      id: playerId,
      reqUid: reqUid || playerId,
      displayName: displayName || playerId,
      channel,
      kcc: null,
      body: null,
      collider: null,
      isReady: false,
      isBot: false,
      inputMask: 0,
      fire: 0,
      timestamp: Date.now(),
      posX: spawnX,
      posY: spawnY,
      posZ: spawnZ,
      velX: 0,
      velY: 0,
      velZ: 0,
      pitch: 0,
      yaw: 0,
      hp: 100,
      score: 0,
      classId: chosenClassId,
      weapon: classDef.primaryWeapon.toLowerCase(),
      weaponState: {
        primary: {
          currentMag: 40,
          reserve: 120,
          isReloading: false,
          reloadTimer: 0,
          fireMode: "auto",
          lastConfirmedShotT: 0,
          leakyBucket: 0,
        },
        secondary: {
          currentMag: 35,
          reserve: 100,
          isReloading: false,
          reloadTimer: 0,
          fireMode: "auto",
          lastConfirmedShotT: 0,
          leakyBucket: 0,
        },
      },
      ping: 30,
      lastSequence: 0,
      leakyRateLimit: 0,
      lastFireTime: 0,
      velEmaX: 0,
      velEmaY: 0,
      velEmaZ: 0,
      adMultiplier: 1,
      firedThisTick: false,
      maxHp: PLAYER_MAX_HP,
      isAlive: true,
      isDead: false,
      respawnTimer: 0,
      lastDamageSource: { type: "bullet", entityId: "", entityType: "player" },
      deathPosition: { x: 0, y: 0, z: 0 },
      stats: {
        damageDealt: 0,
        damageReceived: 0,
        deaths: 0,
        droneEliminations: 0,
        assists: 0,
        objectiveTimeHeld: 0,
        revivesPerformed: 0,
        distanceTravelled: 0,
        timeAlive: 0,
        scoreIndividual: 0,
      },
      lastFallStartY: 1.2,
      utilityState: createInitialUtilityState(chosenClassId, ACTIVE_GAMEMODE.utilityCooldownMultiplier),
    };

    if (stats) {
      Object.assign(pState.stats, stats);
    }

    // Create KCC bounds
    const bodyDesc =
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        pState.posX,
        pState.posY,
        pState.posZ,
      );
    pState.body = this.rapierWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.4);
    pState.collider = this.rapierWorld.createCollider(
      colliderDesc,
      pState.body,
    );
    this.colliderToEntityMap.set(pState.collider.handle, { type: "player", obj: pState });
    // console.log('[COLLIDE_DIAG] Player collider created. playerId:', playerId, 'colliderHandle:', pState.collider.handle, 'collisionGroups:', pState.collider.collisionGroups(), 'solverGroups:', pState.collider.solverGroups(), 'isSensor:', pState.collider.isSensor(), 'shape:', JSON.stringify(colliderDesc.shape));
    pState.kcc = this.rapierWorld.createCharacterController(0.01);
    pState.kcc.setUp({ x: 0, y: 1, z: 0 });
    pState.kcc.setApplyImpulsesToDynamicBodies(true);

    this.players.set(playerId, pState);

    // Initial positioning handshake
    channel.emit("handshake", {
      type: "handshake",
      id: playerId,
      zones: Object.values(ZONES),
      position: { x: pState.posX, y: pState.posY, z: pState.posZ },
    });

    channel.emit("reliable_event", {
      type: "UTILITY_STATE",
      state: pState.utilityState,
    });
    return pState;
  }

  public registerBotPlayer(): PlayerState {
      const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
      const dummyChannel: any = {
          emit: () => {},
          rawEmit: () => {},
          raw: { emit: () => {} }
      };
      
      const pState = this.registerPlayer(botId, dummyChannel as ChannelAdapter, {});
      pState.inputMask = 0; // stands still
      pState.isBot = true;
      pState.isReady = true; // bots are always ready
      return pState;
  }

  public spawnTestBots(count: number) {
      for(let i=0; i<count; i++) {
          this.registerBotPlayer();
      }
  }

  public devSpawnCube(playerId: string, customPos?: { x: number; y: number; z: number }) {
    if (!this.rapierWorld) return;
    let player = this.players.get(playerId);
    if (!player && this.players.size > 0) {
      player = Array.from(this.players.values())[0];
    }
    
    let spawnX = 0, spawnY = 10, spawnZ = 0;
    if (customPos && customPos.x !== undefined && customPos.y !== undefined && customPos.z !== undefined) {
      spawnX = Number(customPos.x);
      spawnY = Number(customPos.y);
      spawnZ = Number(customPos.z);
    } else if (player) {
      // Position the cube 5 meters in front of the player, and 3 meters high
      const forwardX = Math.sin(player.yaw);
      const forwardZ = Math.cos(player.yaw);
      spawnX = player.posX + forwardX * 5.0;
      spawnY = player.posY + 3.0;
      spawnZ = player.posZ + forwardZ * 5.0;
    }
    
    // Clean old
    if (this.devCubeBody) {
      try {
        this.rapierWorld.removeRigidBody(this.devCubeBody);
      } catch (e) {}
    }
    
    this.devCubeEvents = [];
    this.devCubePrevState = "air";
    this.devCubeSpawned = true;
    
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(spawnX, spawnY, spawnZ);
    this.devCubeBody = this.rapierWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    this.devCubeCollider = this.rapierWorld.createCollider(colliderDesc, this.devCubeBody);
    
    this.devCubeEvents.push(`Spawned dynamic cube at (${spawnX.toFixed(2)}, ${spawnY.toFixed(2)}, ${spawnZ.toFixed(2)})`);
    console.log(`[PHYSICS DEBUG] Spawned server debug cube at (${spawnX.toFixed(2)}, ${spawnY.toFixed(2)}, ${spawnZ.toFixed(2)})`);
  }

  public devClearCube() {
    if (this.devCubeBody) {
      try {
        this.rapierWorld.removeRigidBody(this.devCubeBody);
      } catch (e) {}
      this.devCubeBody = null;
      this.devCubeCollider = null;
    }
    this.devCubeSpawned = false;
    this.devCubeEvents = [];
  }

  public setDevPhysicsGravityY(gY: number) {
    this.devPhysicsGravityY = gY;
    if (this.rapierWorld) {
      this.rapierWorld.gravity = { x: 0, y: gY, z: 0 };
    }
    this.broadcastReliableEvent({
      type: "dev_physics_settings_sync",
      gravityY: this.devPhysicsGravityY,
      speedMultiplier: this.devPhysicsSpeedMultiplier,
      paused: this.devPhysicsPaused
    });
  }

  public setDevPhysicsSpeedMultiplier(sM: number) {
    this.devPhysicsSpeedMultiplier = sM;
    this.broadcastReliableEvent({
      type: "dev_physics_settings_sync",
      gravityY: this.devPhysicsGravityY,
      speedMultiplier: this.devPhysicsSpeedMultiplier,
      paused: this.devPhysicsPaused
    });
  }

  public setDevPhysicsPaused(p: boolean) {
    this.devPhysicsPaused = p;
    this.broadcastReliableEvent({
      type: "dev_physics_settings_sync",
      gravityY: this.devPhysicsGravityY,
      speedMultiplier: this.devPhysicsSpeedMultiplier,
      paused: this.devPhysicsPaused
    });
  }

  public setDevPhysicsStepOnce() {
    this.devPhysicsStepOnceRequested = true;
  }

  public handlePlayerDisconnect(playerId: string) {
    const p = this.players.get(playerId);
    if (!p) return;

    if (p.disconnectTimer) {
      clearTimeout(p.disconnectTimer);
    }

    console.log(`[MATCH] Starting 75-second grace period for player ${playerId}`);
    p.disconnectTimer = setTimeout(async () => {
      const pCheck = this.players.get(playerId);
      if (pCheck && (!pCheck.channel || !pCheck.channel.connected)) {
        console.log(`[MATCH] Disconnect grace period (75s) expired for ${playerId}. Triggering match abandonment.`);
        await this.handlePlayerAbandonment(playerId);
      }
    }, 75000);
  }

  public handlePlayerReconnect(playerId: string, newChannel: ChannelAdapter) {
    const p = this.players.get(playerId);
    if (p) {
      if (p.disconnectTimer) {
        clearTimeout(p.disconnectTimer);
        p.disconnectTimer = undefined;
        console.log(`[MATCH] Player ${playerId} reconnected during 75s grace period.`);
      }
      p.channel = newChannel;
    }
  }

  public async handlePlayerAbandonment(playerId: string) {
    const p = this.players.get(playerId);
    if (!p) {
      this.abandonedPlayerIds.add(playerId);
      return;
    }

    if (p.disconnectTimer) {
      clearTimeout(p.disconnectTimer);
      p.disconnectTimer = undefined;
    }

    p.abandonedMatch = true;
    this.abandonedPlayerIds.add(playerId);
    const uid = p.reqUid || p.id;

    if (!p.isBot) {
      console.log(`[MatchRoom] Recording abandonment offense for player ${uid}...`);
      await MatchAbuseStore.recordOffense(uid);
    }

    this.removePlayer(playerId);
  }

  public removePlayer(playerId: string) {
    const p = this.players.get(playerId);
    if (p) {
      if (p.disconnectTimer) {
        clearTimeout(p.disconnectTimer);
        p.disconnectTimer = undefined;
      }
      this.outOfBoundsEnforcer.resetPlayer(playerId);
      if (p.collider) {
        this.colliderToEntityMap.delete(p.collider.handle);
      }
      if (p.body) this.rapierWorld.removeRigidBody(p.body);
      this.players.delete(playerId);
      this.broadcastReliableEvent({ type: "PLAYER_LEFT", playerId });

      let hasRealPlayers = false;
      for (const player of this.players.values()) {
        if (!(player as any).isBot) {
          hasRealPlayers = true;
          break;
        }
      }
      
      if (!hasRealPlayers) {
        this.shutdown();
      }
    }
  }

  private startSimulationLoops() {
    const PHYSICS_TICK_RATE = 60n;
    const PHYSICS_TIMESTEP = 1000000000n / PHYSICS_TICK_RATE;
    let lastPhysicsTime = process.hrtime.bigint();
    let physicsAccumulator = 0n;

    // Task 1 & 4 Metrics
    let tickTimeSum = 0;
    let tickCount = 0;
    let lastMetricEmit = Date.now();

    this.physicsInterval = setInterval(() => {
      const now = process.hrtime.bigint();
      let elapsed = now - lastPhysicsTime;
      lastPhysicsTime = now;

      if (this.devPhysicsPaused) {
        elapsed = 0n;
      } else {
        elapsed = BigInt(Math.floor(Number(elapsed) * this.devPhysicsSpeedMultiplier));
      }
      physicsAccumulator += elapsed;

      if (this.devPhysicsStepOnceRequested) {
        physicsAccumulator += PHYSICS_TIMESTEP;
        this.devPhysicsStepOnceRequested = false;
      }

      if (physicsAccumulator > PHYSICS_TIMESTEP * 10n) {
        physicsAccumulator = PHYSICS_TIMESTEP * 10n;
      }

      while (physicsAccumulator >= PHYSICS_TIMESTEP) {
        const tickStart = Date.now();
        let preCubePos = { x: 0, y: 0, z: 0 };
        let preCubeVel = { x: 0, y: 0, z: 0 };
        if (this.devCubeBody && this.devCubeSpawned) {
          const translation = this.devCubeBody.translation();
          preCubePos = { x: translation.x, y: translation.y, z: translation.z };
          const linvel = this.devCubeBody.linvel();
          preCubeVel = { x: linvel.x, y: linvel.y, z: linvel.z };
        }

        // Broad-phase update BEFORE character queries
        this.rapierWorld.step();
        this.processTestEntities(Number(PHYSICS_TIMESTEP) / 1000000000.0);

        if (this.serverTick % 60 === 0) {
          let activeDrones = 0;
          for (let i = 0; i < this.drones.length; i++) {
            if (this.drones[i].state !== DroneState.DEAD) activeDrones++;
          }
          recordServerActiveDrones(activeDrones);
          recordServerConnectedPlayers(this.players.size);
        }

        if (this.devCubeBody && this.devCubeSpawned) {
          const t = this.devCubeBody.translation();
          const vel = this.devCubeBody.linvel();
          
          if (t.y < -10 && !this.devCubeEvents.some(e => e.includes("FELL THROUGH WORLD"))) {
            this.devCubeEvents.push(`[${this.serverTick}] FELL THROUGH WORLD! Pos Y: ${t.y.toFixed(2)}`);
          }
          
          let collidedWith: string[] = [];
          try {
            const sphereShape = RAPIER.ColliderDesc.ball(0.55).shape;
            this.rapierWorld.intersectionsWithShape(
              t,
              { x: 0, y: 0, z: 0, w: 1 },
              sphereShape,
              (collider) => {
                if (collider.handle === this.devCubeCollider?.handle) return true;
                
                const hitEntity = this.findHitEntity(collider.handle);
                if (hitEntity) {
                  if (hitEntity.type === "player") {
                    collidedWith.push("Player");
                  } else if (hitEntity.type === "drone") {
                    collidedWith.push(`Drone (${hitEntity.obj.type})`);
                  }
                } else {
                  const colTranslation = collider.translation();
                  if (collider.shapeType() === RAPIER.ShapeType.Cuboid) {
                    if (Math.abs(colTranslation.y - (-0.5)) < 0.1) {
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
              const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
              
              const dy = t.y - preCubePos.y;
              // Compute solver Y normal force correction
              const expectedFall = this.devPhysicsGravityY * (1 / 60);
              const normalForceCorrectionY = dy - expectedFall;

              this.devCubeEvents.push(`COLLISION: Touch ${collidedWith.join(", ")}`);
              this.devCubeEvents.push(`  - Pre-Pos:  (${preCubePos.x.toFixed(3)}, ${preCubePos.y.toFixed(3)}, ${preCubePos.z.toFixed(3)})`);
              this.devCubeEvents.push(`  - Post-Pos: (${t.x.toFixed(3)}, ${t.y.toFixed(3)}, ${t.z.toFixed(3)})`);
              this.devCubeEvents.push(`  - Pre-Vel:  (${preCubeVel.x.toFixed(2)}, ${preCubeVel.y.toFixed(2)}, ${preCubeVel.z.toFixed(2)})`);
              this.devCubeEvents.push(`  - Post-Vel: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}, ${vel.z.toFixed(2)})`);
              this.devCubeEvents.push(`  - Correct:  X: ${(t.x - preCubePos.x).toFixed(4)} | Y: ${normalForceCorrectionY.toFixed(4)} | Z: ${(t.z - preCubePos.z).toFixed(4)}`);
              
              this.devCubePrevState = "ground";
            }
          } else {
            if (this.devCubePrevState === "ground" && Math.abs(vel.y) > 0.1) {
              this.devCubeEvents.push(`Left surface, currently in air. Vel Y: ${vel.y.toFixed(2)}`);
              this.devCubePrevState = "air";
            }
          }
          
          if (this.devCubeEvents.length > 50) {
            this.devCubeEvents.splice(0, this.devCubeEvents.length - 50);
          }
        }

        if (this.matchActive) {
          this.serverTick++;
          const matchElapsed = (Date.now() - this.matchStartTime) / 1000;
          if (matchElapsed >= ACTIVE_GAMEMODE.matchDuration) {
            this.handleMatchEnd("loss");
            continue;
          }

          // Respawn ticks & weapon states
          for (const player of this.players.values()) {
            if (player.body && player.isAlive) {
              const t = player.body.translation();
              player.posX = t.x;
              player.posY = t.y;
              player.posZ = t.z;

              // Continuous coordinate telemetry for debugging
              let nearestDrone: ServerDrone | null = null;
              let minDistSq = Infinity;

              for (let i = 0; i < this.drones.length; i++) {
                const d = this.drones[i];
                if (d.state === DroneState.DEAD) continue;
                
                const dx = d.posX - player.posX;
                const dy = d.posY - player.posY;
                const dz = d.posZ - player.posZ;
                const distSq = dx*dx + dy*dy + dz*dz;
                
                if (distSq < minDistSq) {
                  minDistSq = distSq;
                  nearestDrone = d;
                }
              }

              if (nearestDrone && player.channel) {
                const telemetry = {
                  tick: this.serverTick,
                  player: { x: player.posX, y: player.posY, z: player.posZ },
                  drone: { 
                    id: nearestDrone.id, 
                    x: nearestDrone.posX, 
                    y: nearestDrone.posY, 
                    z: nearestDrone.posZ 
                  },
                  dist: Math.sqrt(minDistSq)
                };
                player.channel.emit("dev_collision_telemetry", telemetry);
              }
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
                console.log("[RESPAWN] triggering respawn for", player.id);
                player.isAlive = true;
                player.isDead = false;
                player.hp = player.maxHp;
                
                // Reset weapon state on respawn
                player.weaponState.primary.reserve = 120;
                player.weaponState.primary.currentMag = 40;
                player.weaponState.primary.isReloading = false;
                player.weaponState.primary.reloadTimer = 0;
                player.weaponState.secondary.reserve = 60;
                player.weaponState.secondary.currentMag = 35;
                player.weaponState.secondary.isReloading = false;
                player.weaponState.secondary.reloadTimer = 0;
                
                if (ACTIVE_GAMEMODE.utilityResetsOnRespawn && player.utilityState) {
                  player.utilityState = createInitialUtilityState(player.classId || "ASSAULT", ACTIVE_GAMEMODE.utilityCooldownMultiplier);
                  player.channel.emit("reliable_event", {
                    type: "UTILITY_STATE",
                    state: player.utilityState,
                  });
                }
                
                const spawnX = this.specJson?.playerSpawn?.position?.x ?? ((Math.random() - 0.5) * 40);
                const spawnY = (this.specJson?.playerSpawn?.position?.y ?? 0) + 5.0;
                const spawnZ = this.specJson?.playerSpawn?.position?.z ?? (120 + (Math.random() - 0.5) * 10);

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
                this.broadcastReliableEvent({
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

            // Reload timers
            ["primary", "secondary"].forEach((s) => {
              const slot = s as "primary" | "secondary";
              const wState = player.weaponState[slot];
              if (wState.isReloading) {
                wState.reloadTimer--;
                if (wState.reloadTimer <= 0) {
                  wState.isReloading = false;
                  const maxCapacity = slot === "primary" ? 40 : 35;
                  const needed = maxCapacity - wState.currentMag;
                  const taken = Math.min(needed, wState.reserve);
                  wState.currentMag += taken;
                  wState.reserve -= taken;
                  player.channel.emit("reliable_event", {
                    type: "AMMO_STATE",
                    primary: player.weaponState.primary,
                    secondary: player.weaponState.secondary,
                  });
                }
              }
            });

            // Utility cooldown tick
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
                  if (this.serverTick % 10 === 0) {
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
            // console.log('[MOVEMENT DEBUG] player.kcc:', !!player.kcc, 'player.body:', !!player.body, 'player.collider:', !!player.collider, 'playerId:', player.id);
            if (player.kcc && player.body && player.collider) {
              
              if ((player as any).isBot) {
                player.inputMask |= 0x01; // keep pushing forward
                if ((player as any).botAngle === undefined) {
                  (player as any).botAngle = Math.random() * Math.PI * 2;
                }
                player.yaw = (player as any).botAngle;
                if (Math.random() < 0.05) {
                  (player as any).botAngle += (Math.random() - 0.5) * 1.5;
                }
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

              // Synchronize collider height with client prediction
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
              if (isCrouch) speedMultiplier = PLAYER_CROUCH_SPEED / PLAYER_BASE_SPEED;
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

              // Simple jump / gravity mechanics
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
              if (DEBUG_PHYSICS_TICKS && this.serverTick % 300 === 0) {
                // console.log('[COLLIDE_DIAG] KCC query about to run. playerId:', player.id, 'colliderHandle:', player.collider.handle, 'desiredTranslation:', JSON.stringify(desiredTranslation), 'filterFlags:', RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
              }
              player.kcc.computeColliderMovement(
                player.collider,
                desiredTranslation,
                RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
                undefined,
                undefined
              );

              const correctedTrans = player.kcc.computedMovement();
              if (DEBUG_PHYSICS_TICKS && this.serverTick % 300 === 0) {
                // console.log('[COLLIDE_DIAG] KCC query result. playerId:', player.id, 'correctedTrans:', JSON.stringify(correctedTrans), 'computedGrounded:', player.kcc.computedGrounded(), 'numComputedCollisions:', player.kcc.numComputedCollisions());
              }

              const playerCollisionsList: string[] = [];
              for (let i = 0; i < player.kcc.numComputedCollisions(); i++) {
                const collision = player.kcc.computedCollision(i);
                if (DEBUG_PHYSICS_TICKS && this.serverTick % 300 === 0) {
                  // console.log('[COLLIDE_DIAG] KCC detected collision. playerId:', player.id, 'collisionIndex:', i, 'colliderHandle:', collision ? (collision.collider ? collision.collider.handle : 'unknown') : 'unknown', 'toi:', collision ? (collision.toi !== undefined ? collision.toi : 'unknown') : 'unknown');
                }
                if (collision && collision.collider) {
                  const hit = this.findHitEntity(collision.collider.handle);
                  if (hit) {
                    if (hit.type === "player") {
                      playerCollisionsList.push(`Player_${hit.obj.id}`);
                    } else if (hit.type === "drone") {
                      playerCollisionsList.push(`Drone_${hit.obj.id}_Type_${hit.obj.type}`);
                    }
                  } else {
                    // For static geometry, we can check translation/shape to identify it
                    const colTrans = collision.collider.translation();
                    if (collision.collider.shapeType() === RAPIER.ShapeType.Cuboid) {
                      if (Math.abs(colTrans.y - (-0.5)) < 0.1) {
                        playerCollisionsList.push("Floor");
                      } else {
                        playerCollisionsList.push("Building");
                      }
                    } else {
                      playerCollisionsList.push("StaticWallOrBoundary");
                    }
                  }
                }
              }
              (player as any).activeCollisions = playerCollisionsList;
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

              // Telemetry Updates: timeAlive, distanceTravelled, objectiveTimeHeld
              const dtSec = 0.016666;
              player.stats.timeAlive += dtSec;

              const pDx = player.posX - prevX;
              const pDy = player.posY - prevY;
              const pDz = player.posZ - prevZ;
              const pDist = Math.sqrt(pDx * pDx + pDy * pDy + pDz * pDz);
              player.stats.distanceTravelled += pDist;

              // Objective Proximity Radius Check (Core Objective Waypoint: 384, 384)
              const coreX = 384;
              const coreZ = 384;
              const objRad = ACTIVE_GAMEMODE.objectiveProximityRadius || 3;
              const odx = player.posX - coreX;
              const odz = player.posZ - coreZ;
              const inObjRadius = (odx * odx + odz * odz <= objRad * objRad);

              if (inObjRadius) {
                player.stats.objectiveTimeHeld += dtSec;
                if (player.isHoldingObjective) {
                  player.currentObjectiveProgress = (player.currentObjectiveProgress || 0) + dtSec;
                  const reqHold = ACTIVE_GAMEMODE.objectiveHoldTime || 8.0;

                  if (this.serverTick % 10 === 0 || player.currentObjectiveProgress >= reqHold) {
                    player.channel.emit("reliable_event", {
                      type: "OBJECTIVE_PROGRESS",
                      progressSec: player.currentObjectiveProgress,
                      requiredSec: reqHold
                    });
                  }

                  if (player.currentObjectiveProgress >= reqHold) {
                    // Core Objective Accomplished - Rogue LLM Core Disabled!
                    this.handleMatchEnd("win");
                  }
                } else {
                  if (ACTIVE_GAMEMODE.objectiveResetOnExit && player.currentObjectiveProgress) {
                    player.currentObjectiveProgress = 0;
                  }
                }
              } else {
                if (ACTIVE_GAMEMODE.objectiveResetOnExit && player.currentObjectiveProgress) {
                  player.currentObjectiveProgress = 0;
                  player.isHoldingObjective = false;
                  player.channel.emit("reliable_event", {
                    type: "OBJECTIVE_PROGRESS",
                    progressSec: 0,
                    requiredSec: ACTIVE_GAMEMODE.objectiveHoldTime || 8.0
                  });
                }
              }

              if (Math.abs(correctedTrans.x) < Math.abs(desiredTranslation.x) * 0.9 || 
                  Math.abs(correctedTrans.z) < Math.abs(desiredTranslation.z) * 0.9) {
                  const iterStr = Array.from(this.players.entries())[0][0]; // just logic for logging
                  if (player.id === iterStr && (player.inputMask & 0x01)!== 0) {
                      if (DEBUG_PHYSICS_TICKS) console.log(`[COLLISION HIT] Player blocked! Wanted Z: ${desiredTranslation.z.toFixed(4)}, got Z: ${correctedTrans.z.toFixed(4)}. Current Pos: ${player.posX.toFixed(2)}, ${player.posZ.toFixed(2)}`);
                  }
              }

              // Fall damage thresholds
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
                      this.applyDamage(
                        player.id,
                        fallDamage,
                        "fall",
                        "0",
                        "environment",
                      );
                    }
                  }
                }
              }

              // EMA Smoothed speed estimations
              const actualVx = (player.posX - prevX) / 0.0166;
              const actualVy = (player.posY - prevY) / 0.0166;
              const actualVz = (player.posZ - prevZ) / 0.0166;
              
              // Simple speed hack check (security exploit metric)
              const speedSq = actualVx*actualVx + actualVz*actualVz;
              if (speedSq > 900) { // > 30m/s
                recordSecurityExploit("speed_teleport_detected", {
                  playerId: player.id,
                  speed: Math.sqrt(speedSq),
                  pos: { x: player.posX, y: player.posY, z: player.posZ }
                });
              }
              player.velEmaX = player.velEmaX * 0.8 + actualVx * 0.2;
              player.velEmaY = player.velEmaY * 0.8 + actualVy * 0.2;
              player.velEmaZ = player.velEmaZ * 0.8 + actualVz * 0.2;
            } // end if player.kcc...
          }

          // Out of Bounds and Restricted Gate Enforcement
          this.outOfBoundsEnforcer.tick(this, 16.66);

          // World updates (RVO avoidance, projectile updates)
          this.updateSystemEntities();

          if (DEBUG_PHYSICS_TICKS && this.serverTick % 300 === 0) {
            for (const player of this.players.values()) {
              const overlappingHandles: number[] = [];
              const sphereShape = RAPIER.ColliderDesc.ball(1.0).shape;
              this.rapierWorld.intersectionsWithShape(
                { x: player.posX, y: player.posY, z: player.posZ },
                { x: 0, y: 0, z: 0, w: 1 },
                sphereShape,
                (collider) => {
                  overlappingHandles.push(collider.handle);
                  return true;
                }
              );
              // console.log('[COLLIDE_DIAG] Overlap query at player position. playerId:', player.id, 'position:', player.posX.toFixed(2), player.posY.toFixed(2), player.posZ.toFixed(2), 'overlappingHandles:', JSON.stringify(overlappingHandles));
            }
          }
        }

        const tickEnd = Date.now();
        tickTimeSum += (tickEnd - tickStart);
        tickCount++;

        if (Date.now() - lastMetricEmit >= 1000) {
          const avgTickMs = tickCount > 0 ? tickTimeSum / tickCount : 0;
          const mem = process.memoryUsage();
          this.broadcastReliableEvent({
            type: "dev_server_tick_ms",
            tickMs: avgTickMs
          });
          this.broadcastReliableEvent({
            type: "dev_server_memory_mb",
            heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024)
          });
          tickTimeSum = 0;
          tickCount = 0;
          lastMetricEmit = Date.now();
        }

        recordServerTickDuration(Date.now() - tickStart);
        physicsAccumulator -= PHYSICS_TIMESTEP;
      }
    }, 5);

    // AI timing loop (8s)
    this.aiInterval = setInterval(() => {
      if (!this.matchActive) return;
      if (this.llmCommanderDisabled) {
        return;
      }
      if (
        this.aiCommanderActive && this.llmCommander &&
        Date.now() > this.llmCommander.geminiThrottleCooldownUntil
      ) {
        this.llmCommander.executeLLMStep();
      } else {
        this.offlineSystemFallbackAI();
      }
    }, 8000);

    // Sync broadcast networking updates (20Hz)
    this.syncInterval = setInterval(() => {
      if (this.players.size === 0) return;
      if (!this.matchActive) return;

      const packedData = this.packWorldNetworkData();
      const activeProj = [];
      for (let i = 0; i < MAX_PROJECTILES; i++) {
        if (this.projActive[i]) {
          activeProj.push({
            x: this.projPosX[i],
            y: this.projPosY[i],
            z: this.projPosZ[i],
            enemy: this.projEnemy[i] === 1,
          });
        }
      }

      const detailedPlayers = Array.from(this.players.values()).map((p) => ({
        id: p.id,
        hp: p.hp,
        score: p.score,
        posX: p.posX,
        posY: p.posY,
        posZ: p.posZ,
        yaw: p.yaw,
        currentWeapon: p.weapon || 'rifle',
        isFiring: p.firedThisTick || false, // boolean
        isReloading: p.weaponState.primary.isReloading || p.weaponState.secondary.isReloading, // approximated to any slot reloading
        isAlive: p.isAlive,
        activeCollisions: (p as any).activeCollisions || [],
      }));

      const devDrones = this.drones.filter(d => d.state !== DroneState.DEAD).map(d => ({
        id: d.id,
        groupId: d.groupId,
        targetX: d.targetX,
        targetY: d.targetY,
        targetZ: d.targetZ,
        mode: d.mode,
        memory: d.memoryRecords ? Array.from(d.memoryRecords.values()).filter(m => m.confidence > 0).map(m => ({ id: m.entityId, x: m.lastSensedPosition.x, y: m.lastSensedPosition.y, z: m.lastSensedPosition.z, conf: m.confidence })) : []
      }));

      let cubeSyncData = null;
      if (this.devCubeBody && this.devCubeSpawned) {
        const t = this.devCubeBody.translation();
        const vel = this.devCubeBody.linvel();
        cubeSyncData = {
          x: t.x,
          y: t.y,
          z: t.z,
          vx: vel.x,
          vy: vel.y,
          vz: vel.z,
          events: [...this.devCubeEvents]
        };
      }

      for (const player of this.players.values()) {
        try {
          player.channel.rawEmit(packedData);

          this.playerSyncView.setUint32(0, this.serverTick, true);
          this.playerSyncView.setUint32(4, player.lastSequence, true);
          this.playerSyncView.setFloat32(8, player.posX, true);
          this.playerSyncView.setFloat32(12, player.posY, true);
          this.playerSyncView.setFloat32(16, player.posZ, true);
          player.channel.rawEmit(this.playerSyncBuffer);

          player.channel.emit("state_sync", {
            type: "state_sync",
            tick: this.serverTick,
            projectiles: activeProj,
            players: detailedPlayers,
            serverCube: cubeSyncData,
            devDrones: devDrones,
            liveZoneSummary: this.zoneSummary
          });
        } catch (e) {
          // Discard safely
        }
      }
    }, 50.0);
  }

  public registerDeveloperSpawner(type: number, pos?: { x: number; y: number; z: number }): boolean {
    let spawned = false;
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.state === DroneState.DEAD) {
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
            this.mapId === "map_1_facility"
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

        spawned = true;
        this.broadcastReliableEvent({
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

  public executeAABBShotValidation(
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    timestamp: number,
  ): { hit: boolean; droneId: number } {
    let bestHitDrone: ServerDrone | null = null;
    let minTimeOfImpact = 999999.0;

    // Apply temporal rollback checks
    const pingCompensatedTick = Math.max(
      0,
      this.serverTick - Math.min(12, Math.floor(timestamp / 16.6)),
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

        const droneRef = this.drones.find((d) => d.id === dId);
        if (droneRef && droneRef.state !== DroneState.DEAD) {
          const distToDrone = Math.sqrt(
            (rx - origin.x) * (rx - origin.x) +
              (ry - origin.y) * (ry - origin.y) +
              (rz - origin.z) * (rz - origin.z),
          );
          if (distToDrone < minTimeOfImpact) {
            minTimeOfImpact = distToDrone;
            bestHitDrone = droneRef;
          }
        }
      }
    } else {
      // Fallback directly to present moments
      for (let i = 0; i < this.drones.length; i++) {
        const d = this.drones[i];
        if (d.state !== DroneState.DEAD) {
          const distToDrone = Math.sqrt(
            (d.posX - origin.x) * (d.posX - origin.x) +
              (d.posY - origin.y) * (d.posY - origin.y) +
              (d.posZ - origin.z) * (d.posZ - origin.z),
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
        this.collisionMap &&
        this.collisionMap.rayIntersectsAny(origin, dir, minTimeOfImpact)
      ) {
        return { hit: false, droneId: 0 };
      }
      return { hit: true, droneId: bestHitDrone.id };
    }
    return { hit: false, droneId: 0 };
  }

  private updateSystemEntities() {
    let detectedZones = new Set<ZoneName>();

    // Process projectiles
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (this.projActive[i]) {
        this.projPosX[i] += this.projVelX[i] * 0.1666;
        this.projPosY[i] += this.projVelY[i] * 0.1666;
        this.projPosZ[i] += this.projVelZ[i] * 0.1666;
        this.projDist[i] +=
          Math.sqrt(
            this.projVelX[i] * this.projVelX[i] +
              this.projVelY[i] * this.projVelY[i] +
              this.projVelZ[i] * this.projVelZ[i],
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
          // Hits players
          for (const player of this.players.values()) {
            if (!player.isAlive) continue;
            // Exclusion check: bullet never hits the shooter who fired it
            if (player.id === this.projSourceId[i]) {
              continue;
            }
            const dx = player.posX - this.projPosX[i];
            const dy = player.posY - this.projPosY[i];
            const dz = player.posZ - this.projPosZ[i];
            if (dx * dx + dy * dy + dz * dz < 2.25) {
              this.applyDamage(
                player.id,
                this.projDamage[i],
                "bullet",
                this.projSourceId[i],
                "drone",
              );
              this.projActive[i] = 0;
              break;
            }
          }
        } else {
          // Hits drones
          for (let j = 0; j < this.drones.length; j++) {
            const d = this.drones[j];
            if (d.state !== DroneState.DEAD) {
              // Exclusion check: bullet never hits the firing drone/shooter itself
              if (d.id.toString() === this.projSourceId[i]) {
                continue;
              }
              const dx = d.posX - this.projPosX[i];
              const dy = d.posY - this.projPosY[i];
              const dz = d.posZ - this.projPosZ[i];
              if (dx * dx + dy * dy + dz * dz < d.rad * d.rad) {
                d.hp -= this.projDamage[i];
                d.lastDamageTick = this.serverTick;
                if (!d.damageLog) d.damageLog = [];
                d.damageLog.push({
                  playerId: this.projSourceId[i],
                  timestamp: Date.now()
                });
                this.projActive[i] = 0;
                if (d.hp <= 0) {
                  this.processDroneKillAssists(d, this.projSourceId[i]);
                  const killer = this.players.get(this.projSourceId[i]);
                  if (killer) {
                    killer.stats.droneEliminations += 1;
                    killer.stats.scoreIndividual += 100;
                  }
                  this.despawnDrone(d);
                  this.broadcastReliableEvent({
                    type: "drone_killed",
                    id: d.id,
                    zone: d.zone,
                  });
                }
                break;
              }
            }
          }
          // Hits zone cameras
          if (this.projActive[i]) {
            for (let j = 0; j < this.cameras.length; j++) {
              if (this.cameras[j].isActive) {
                const dx = this.cameras[j].posX - this.projPosX[i];
                const dy = this.cameras[j].posY - this.projPosY[i];
                const dz = this.cameras[j].posZ - this.projPosZ[i];
                if (dx * dx + dy * dy + dz * dz < 4) {
                  this.cameras[j].hp -= this.projDamage[i];
                  this.projActive[i] = 0;
                  if (this.cameras[j].hp <= 0) this.cameras[j].isActive = false;
                  break;
                }
              }
            }
          }
        }
      }
    }

    let targetPlayer: PlayerState | null = null;
    for (const p of this.players.values()) {
      targetPlayer = p;
      break;
    }

    const nowMs = Date.now();
    for (const zoneId of ZONES_ARRAY) {
      this.zoneSummary[zoneId].droneGroups.length = 0;
    }
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.state !== DroneState.DEAD) {
        if (!this.zoneSummary[d.zone].droneGroups.includes(d.groupId)) {
          this.zoneSummary[d.zone].droneGroups.push(d.groupId);
        }
      }
    }

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

      // Drone detection check LOS
      for (let i = 0; i < this.drones.length; i++) {
        const d = this.drones[i];
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

      // Camera checks LOS (skip if camera disabled by EMP)
      for (let c = 0; c < this.cameras.length; c++) {
        if (
          this.cameras[c].isActive &&
          (!this.cameras[c].disabledUntil || this.cameras[c].disabledUntil! <= nowMs)
        ) {
          const dx = targetPlayer.posX - this.cameras[c].posX;
          const dy = targetPlayer.posY - this.cameras[c].posY;
          const dz = targetPlayer.posZ - this.cameras[c].posZ;
          if (
            dx * dx + dy * dy + dz * dz <
            this.cameras[c].detectionRadius * this.cameras[c].detectionRadius
          ) {
            let hasLOS = true;
            if (this.rapierWorld) {
              const rayDir = {
                x: targetPlayer.posX - this.cameras[c].posX,
                y: targetPlayer.posY - this.cameras[c].posY,
                z: targetPlayer.posZ - this.cameras[c].posZ,
              };
              const len = Math.sqrt(
                rayDir.x * rayDir.x + rayDir.y * rayDir.y + rayDir.z * rayDir.z,
              );
              if (len > 0) {
                rayDir.x /= len;
                rayDir.y /= len;
                rayDir.z /= len;
                const ray = new RAPIER.Ray(
                  {
                    x: this.cameras[c].posX,
                    y: this.cameras[c].posY,
                    z: this.cameras[c].posZ,
                  },
                  rayDir,
                );
                const hit = this.rapierWorld.castRay(
                  ray,
                  len,
                  true,
                  RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
                );
                if (hit && hit.collider && hit.timeOfImpact < len - 0.7)
                  hasLOS = false;
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

      // Signal Disruptor suppresses detection & degrades zone presence confidence to 0.0
      const isSignalDisrupted =
        targetPlayer.signalDisruptorUntil && targetPlayer.signalDisruptorUntil > nowMs;
      if (isSignalDisrupted) {
        detectedZones.clear();
      }

      for (const zoneId of ZONES_ARRAY) {
        const z = this.zoneSummary[zoneId];
        if (isSignalDisrupted && zoneId === playerZone) {
          z.confidence = 0.0;
        } else if (detectedZones.has(zoneId)) {
          z.confidence = 1.0;
          z.lastSeenTimestamp = nowMs;
        } else {
          const elapsed = z.lastSeenTimestamp > 0 ? nowMs - z.lastSeenTimestamp : 60000;
          z.confidence = Math.max(0.0, Math.min(1.0, Math.round((1.0 - elapsed / 60000) * 100) / 100));

          for (let i = 0; i < this.drones.length; i++) {
            if (
              this.drones[i].state !== DroneState.DEAD &&
              this.drones[i].type === DroneType.RECON &&
              this.drones[i].zone === zoneId
            ) {
              z.confidence = 1.0;
            }
          }
        }
      }
    }

    processDroneIntelligence(nowMs, this.drones, this.players, this.rapierWorld, RAPIER, 0.0166, this.collisionMap);

    // Drone state updates
    processDroneBehaviors(this.drones, this, 0.0166, nowMs);

    // Proximity Mines tick check

    // Proximity Mines tick check
    if (this.proximityMines.length > 0) {
      let writeIdx = 0;
      for (let m = 0; m < this.proximityMines.length; m++) {
        const mine = this.proximityMines[m];
        if (mine.triggered) continue;

        let triggered = false;
        for (let i = 0; i < this.drones.length; i++) {
          const d = this.drones[i];
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
          this.broadcastReliableEvent({
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

    // Reset firedThisTick for all players at the end of the tick
    for (const p of this.players.values()) {
      p.firedThisTick = false;
    }

    this.recordDroneHistory();
  }

  private recordDroneHistory() {
    const baseIdx = this.historicalAABBIndex * HISTORIC_BLOCK_SIZE;
    this.historicalAABBHistory[baseIdx] = this.serverTick;
    let count = 0;
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
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


  public spawnServerProjectile(
    x: number,
    y: number,
    z: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    isEnemy: boolean,
    damage: number,
    sourceId: string,
  ) {
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
      
      const p = this.players.get(sourceId);
      if (p) {
         p.firedThisTick = true;
      }
    }
  }

  // This goes against the entire point of vexea. Omniscient dumb deterministic commander isn't acceptable.
  public offlineSystemFallbackAI() {
    return; // Disabled: Omniscient dumb deterministic commander is not acceptable.
    let targetPlayer: PlayerState | null = null;
    for (const p of this.players.values()) {
      targetPlayer = p;
      break;
    }

    let playerZone: ZoneName = ZONES.CORE;
    if (targetPlayer && targetPlayer.hp > 0) {
      for (let u = 0; u < ZONES_ARRAY.length; u++) {
        const zone = ZONES_ARRAY[u];
        const b = ZONE_BOUNDS[zone];
        const dx = Math.abs(targetPlayer.posX - b.center.x);
        const dy = Math.abs(targetPlayer.posY - b.center.y);
        const dz = Math.abs(targetPlayer.posZ - b.center.z);
        if (dx <= b.halfSize.x && dy <= b.halfSize.y && dz <= b.halfSize.z) {
          playerZone = zone;
          break;
        }
      }
    }

    let count = 0;
    for (let i = 0; i < this.drones.length; i++) {
      if (this.drones[i].state !== DroneState.DEAD) {
        count++;
      }
    }

    if (count < 12) {
      const spawnCountNeeded = Math.min(3, 12 - count);
      let spawnedIdx = 0;

      for (let i = 0; i < this.drones.length; i++) {
        const d = this.drones[i];
        if (d.state === DroneState.DEAD) {
          const targetSpawnZone =
            Math.random() < 0.6
              ? playerZone
              : ZONES_ARRAY[Math.floor(Math.random() * ZONES_ARRAY.length)];
          const b = ZONE_BOUNDS[targetSpawnZone];

          d.id = this.nextDroneId++;
          d.state = DroneState.IDLE;
          d.type =
            Math.random() < 0.35 ? DroneType.ROTARY_SHOOTER : DroneType.WHEELED;
          d.zone = targetSpawnZone;

          const isAir = d.type === DroneType.ROTARY_SHOOTER;
          const isTunnels =
            targetSpawnZone === ZONES.TUNNELS ||
            String(targetSpawnZone).toLowerCase().includes("tunnel");
          const spawnType = isAir
            ? "AIR_HANGAR"
            : isTunnels
              ? "ELEVATOR_SHAFT"
              : "GROUND_GARAGE";

          let spawnPos =
            this.mapId === "map_1_facility"
              ? this.getNextSpawnPoint(spawnType)
              : null;
          if (spawnPos) {
            d.posX = spawnPos.x;
            d.posY = spawnPos.y;
            d.posZ = spawnPos.z;
          } else {
            d.posX = b.center.x + (Math.random() - 0.5) * b.halfSize.x * 0.5;
            d.posY = isAir ? b.center.y + 4 : b.center.y + 0.5;
            d.posZ = b.center.z + (Math.random() - 0.5) * b.halfSize.z * 0.5;
          }
          d.hp = DRONE_CONFIGS[d.type]?.hp ?? 100;

          const possibleGroupNames = ["G_ALPHA", "G_BETA", "G_GAMMA"];
          d.groupId =
            possibleGroupNames[
              Math.floor(Math.random() * possibleGroupNames.length)
            ];
          d.cooldown = 40;
          this.initDronePhysics(d);

          spawnedIdx++;
          if (spawnedIdx >= spawnCountNeeded) break;
        }
      }
    }

    // Actively route
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.state !== DroneState.DEAD && d.state !== DroneState.IDLE) {
        if (
          d.zone !== playerZone &&
          (d.path.length === 0 || d.pathIndex >= d.path.length - 1)
        ) {
          if (Math.random() < 0.3) {
            d.path = astarPath(d.zone, playerZone);
            d.pathIndex = 0;
            d.state = DroneState.PATROLLING;
          }
        }
      }
    }
  }


  public applyDamage(
    playerId: string,
    rawDamage: number,
    type: "bullet" | "explosion" | "fall" | "melee",
    entityId: string,
    entityType: "drone" | "environment" | "player",
  ) {
    const p = this.players.get(playerId);
    if (!p || !p.isAlive) return;

    if (p.godMode) {
      p.hp = PLAYER_MAX_HP; // Force-maintain max HP
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

    if (ACTIVE_GAMEMODE.objectiveResetOnDamage && (p.currentObjectiveProgress || 0) > 0) {
      p.currentObjectiveProgress = 0;
      p.isHoldingObjective = false;
      p.channel.emit("reliable_event", {
        type: "OBJECTIVE_INTERRUPTED"
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
      p.respawnTimer = PLAYER_RESPAWN_DELAY_DEFAULT; // 5 seconds respawn time
      p.deathPosition = { x: p.posX, y: p.posY, z: p.posZ };
      p.stats.deaths++;

      console.log("[DEATH] player died:", playerId, "source:", type);

      p.channel.emit("reliable_event", { type: "YOU_DIED", respawnTime: PLAYER_RESPAWN_DELAY_DEFAULT });
      this.broadcastReliableEvent({
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
    sourceType: "drone" | "environment" | "player",
  ) {
    this.broadcastReliableEvent({ type: "EXPLOSION", origin, radius });

    // Splash players
    for (const player of this.players.values()) {
      if (!player.isAlive) continue;
      const dx = player.posX - origin.x;
      const dy = player.posY - origin.y;
      const dz = player.posZ - origin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < radius) {
        const factor = 1.0 - dist / radius;
        const splash = Math.floor(maxDamage * factor);
        if (splash > 0) {
          this.applyDamage(
            player.id,
            splash,
            "explosion",
            sourceId,
            sourceType,
          );
        }
      }
    }

    // Splash drones
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.state !== DroneState.DEAD) {
        // Exclude the source drone itself
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
          d.lastDamageTick = this.serverTick;
          if (sourceType === "player") {
            if (!d.damageLog) d.damageLog = [];
            d.damageLog.push({
              playerId: sourceId,
              timestamp: Date.now()
            });
          }
          if (d.hp <= 0) {
            this.processDroneKillAssists(d, sourceId);
            const killer = this.players.get(sourceId);
            if (killer) {
              killer.stats.droneEliminations += 1;
              killer.stats.scoreIndividual += 100;
            }
            this.despawnDrone(d);
            this.broadcastReliableEvent({
              type: "drone_killed",
              id: d.id,
              zone: d.zone,
            });
          }
        }
      }
    }
  }

  public broadcastReliableEvent(evt: any) {
    const json = JSON.stringify(evt);
    for (const p of this.players.values()) {
      p.channel.emit("reliable_event", JSON.parse(json));
    }
  }

  private handleMatchEnd(result: "win" | "loss"): void {
    this.matchActive = false;
    this.serverTick = 0;
    for (let i = 0; i < this.drones.length; i++) {
      this.drones[i].state = DroneState.DEAD;
    }
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      this.projActive[i] = 0;
    }

    archiveMatchEvent(this, result);

    const allStats: Record<string, any> = {};
    for (const [id, p] of this.players.entries()) {
      allStats[id] = p.stats;
      this.processMatchEndTransaction(id, p.stats, result, p.adMultiplier || 1);

      if (!p.isBot) {
        PlayerProfileStore.update(id, p.stats, p.classId || "ASSAULT", result, this.roomId, p.isBot || false).catch((err) => {
          console.error(`[MatchRoom] Failed to update profile for ${id}:`, err);
        });
      }
    }

    this.broadcastReliableEvent({
      type: "MATCH_END",
      result,
      stats: allStats,
      message: result === "win" ? "SYSTEM TERMINATED" : "CONTRACT FAILED",
    });
  }

  private async processMatchEndTransaction(
    playerId: string,
    playerStats: any,
    result: "win" | "loss",
    adMultiplier: number,
  ) {
    if (this.abandonedPlayerIds.has(playerId)) {
      console.log(`[MatchRoom] Rewards withheld for abandoned match: ${playerId}`);
      return;
    }
    const p = this.players.get(playerId);
    if (p && p.abandonedMatch) {
      console.log(`[MatchRoom] Rewards withheld for abandoned match: ${playerId}`);
      return;
    }

    const isWin = result === "win";

    // Economy values read from feature flags as instructed
    const matchEnergyCost = DEFAULT_SHARED_FEATURE_FLAGS[SharedFeatureFlagKey.MATCH_ENERGY_COST]; // should be 2
    const creditsEarned = 5 + (isWin ? 15 : 0); // NEW reduced rates
    const starterCredits = DEFAULT_SHARED_FEATURE_FLAGS[SharedFeatureFlagKey.NEW_PLAYER_STARTER_CREDITS];
    const starterEnergy = DEFAULT_SHARED_FEATURE_FLAGS[SharedFeatureFlagKey.NEW_PLAYER_STARTER_ENERGY];

    // Build the MatchEndPayload from player stats (Point 3)
    const payload = {
      playerId,
      matchDurationSec: ACTIVE_GAMEMODE.matchDuration,
      kills: playerStats.droneEliminations || 0,
      deaths: playerStats.deaths || 0,
      damageDealt: playerStats.damageDealt || 0,
      objectiveTimeHeld: playerStats.objectiveTimeHeld || 0,
      revives: playerStats.revivesPerformed || 0,
      scoreIndividual: playerStats.scoreIndividual || 0,
      isWin,
      gameMode: ACTIVE_GAMEMODE.id || "INFILTRATION",
      adMultiplier
    };

    try {
      const port = process.env.PORT || 3000;
      const response = await fetch(`http://127.0.0.1:${port}/api/economy/match-rewards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[MatchRoom] API call to match-rewards failed for ${playerId}: ${response.status} ${text}`);
      } else {
        const data = await response.json();
        console.log(`[MatchRoom] Successfully updated rewards via API for ${playerId}:`, data);
      }
    } catch (err) {
      console.error(`[MatchRoom] Error calling match-rewards API for ${playerId}:`, err);
    }
  }

  private packWorldNetworkData(): ArrayBuffer {
    this.payloadWriter.setUint32(0, this.serverTick, true);

    let activeCount = 0;
    for (let i = 0; i < this.drones.length; i++) {
      if (this.drones[i].state !== DroneState.DEAD) {
        activeCount++;
      }
    }
    this.payloadWriter.setUint16(4, activeCount, true);

    let camCount = 0;
    for (let i = 0; i < this.cameras.length; i++) {
      if (this.cameras[i].isActive) {
        camCount++;
      }
    }
    this.payloadWriter.setUint16(6, camCount, true);

    let byteOffset = HEADER_SIZE;
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.state !== DroneState.DEAD) {
        this.payloadWriter.setUint16(byteOffset, d.id, true);
        this.payloadWriter.setFloat32(byteOffset + 2, d.posX, true);
        this.payloadWriter.setFloat32(byteOffset + 6, d.posY, true);
        this.payloadWriter.setFloat32(byteOffset + 10, d.posZ, true);
        this.payloadWriter.setFloat32(byteOffset + 14, d.rotX, true);
        this.payloadWriter.setFloat32(byteOffset + 18, d.rotY, true);
        this.payloadWriter.setFloat32(byteOffset + 22, d.rotZ, true);
        this.payloadWriter.setFloat32(byteOffset + 26, d.rotW, true);
        this.payloadWriter.setUint8(byteOffset + 30, d.state);
        let finalType = d.type;
        if (d.playerInFOV) {
          finalType |= 128;
        }
        this.payloadWriter.setUint8(byteOffset + 31, finalType);

        byteOffset += DRONE_STRUCT_SIZE;
        if (byteOffset >= CONST_BUFFER_SIZE) {
          break;
        }
      }
    }

    for (let i = 0; i < this.cameras.length; i++) {
      const c = this.cameras[i];
      if (c.isActive) {
        if (byteOffset + CAMERA_STRUCT_SIZE > CONST_BUFFER_SIZE) break;
        this.payloadWriter.setUint16(byteOffset, c.id, true);
        this.payloadWriter.setUint8(byteOffset + 2, 1);
        this.payloadWriter.setUint8(byteOffset + 3, 0);
        byteOffset += CAMERA_STRUCT_SIZE;
      }
    }

    return this.preallocatedBuffer;
  }

  public setPlayerReady(playerId: string) {
    const p = this.players.get(playerId);
    if (!p) return;

    p.isReady = true;
    console.log(`[VEXEA SERVER] Received player_ready for player: ${playerId} in Room: ${this.roomId}`);

    if (!this.matchActive) {
      console.log(`[VEXEA SERVER] Player ready. Starting match loop in Room: ${this.roomId}`);
      this.triggerStartMatch();
    }
  }

  public triggerStartMatch() {
    if (!this.matchActive) {
      this.matchActive = true;
      this.serverTick = 0;
      this.matchStartTime = Date.now();
      this.apiCallCount = 0;
      this.llmTokensUsedThisMatch = 0;
      this.commanderAP = ACTIVE_GAMEMODE.llmApStartPool;
      this.fixedWingDeploymentsThisMatch = 0;
      this.outstandingOrders.clear();
      console.log(
        `[VEXEA SERVER] Match active! Triggering Loops in Room: ${this.roomId}`,
      );

      this.startSimulationLoops();
      this.broadcastReliableEvent({ type: "match_ready", mapId: this.mapId });

      for (const p of this.players.values()) {
        p.channel.emit("match_ready", { mapId: this.mapId });
      }
    }
  }

  public spawnTestEntity(x: number, y: number, z: number) {
    let spawned = false;
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.state === DroneState.DEAD) {
        d.id = this.nextDroneId++;
        d.type = DroneType.TEST_ENTITY; // Test Entity
        d.state = DroneState.IDLE;
        d.zone = ZONES.COURTYARD;
        d.posX = x;
        d.posY = y;
        d.posZ = z;
        d.hp = DRONE_CONFIGS[d.type]?.hp ?? 100;
        d.groupId = "G_TEST";
        d.cooldown = 40;
        (d as any).history = [];
        this.initDronePhysics(d);
        if (d.currentVelocityX !== undefined) {
          d.currentVelocityX = 0;
          d.currentVelocityY = 0;
          d.currentVelocityZ = 0;
          d.currentHeadingX = 1;
          d.currentHeadingZ = 0;
        }
        spawned = true;
        break;
      }
    }
  }

  public clearTestEntities() {
    for (let i = 0; i < this.drones.length; i++) {
      if (this.drones[i].type === DroneType.TEST_ENTITY) {
        this.despawnDrone(this.drones[i]);
      }
    }
  }

  public setTestEntityMode(mode: "NORMAL" | "COMBAT") {
    for (let i = 0; i < this.drones.length; i++) {
      if (this.drones[i].type === DroneType.TEST_ENTITY && this.drones[i].state !== DroneState.DEAD) {
        this.drones[i].mode = mode;
      }
    }
  }

  public setTestEntityTarget(x: number, y: number, z: number) {
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.type === DroneType.TEST_ENTITY && d.state !== DroneState.DEAD) {
        d.targetX = x;
        d.targetY = y;
        d.targetZ = z;
      }
    }
  }

  public triggerTestEntitySight() {
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.type === DroneType.TEST_ENTITY && d.state !== DroneState.DEAD && d.memoryRecords) {
        for (const player of this.players.values()) {
           if (player.isAlive) {
              let rec = d.memoryRecords.get(player.id);
              if (!rec) {
                 rec = { entityId: player.id, lastSensedPosition: { x: 0, y: 0, z: 0 }, timeLastSensed: 0, confidence: 0 };
                 d.memoryRecords.set(player.id, rec);
              }
              rec.lastSensedPosition.x = player.posX;
              rec.lastSensedPosition.y = player.posY;
              rec.lastSensedPosition.z = player.posZ;
              rec.timeLastSensed = Date.now() / 1000;
              rec.confidence = 1.0;
              rec.touchedThisTick = true;
              break;
           }
        }
      }
    }
  }

  public triggerTestEntitySound() {
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.type === DroneType.TEST_ENTITY && d.state !== DroneState.DEAD && d.memoryRecords) {
        for (const player of this.players.values()) {
           if (player.isAlive) {
              let rec = d.memoryRecords.get(player.id);
              if (!rec) {
                 rec = { entityId: player.id, lastSensedPosition: { x: 0, y: 0, z: 0 }, timeLastSensed: 0, confidence: 0 };
                 d.memoryRecords.set(player.id, rec);
              }
              rec.lastSensedPosition.x = player.posX;
              rec.lastSensedPosition.y = player.posY;
              rec.lastSensedPosition.z = player.posZ;
              rec.timeLastSensed = Date.now() / 1000;
              rec.confidence = 1.0;
              rec.touchedThisTick = true;
              break;
           }
        }
      }
    }
  }

  public setTestEntityCollisionFilter(groupStr: string, maskStr: string) {
    const group = parseInt(groupStr);
    const mask = parseInt(maskStr);
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.type === DroneType.TEST_ENTITY && d.state !== DroneState.DEAD && d.collider) {
        d.collider.setCollisionGroups((group << 16) | mask);
      }
    }
  }

  private processTestEntities(dt: number) {
    const telemetry = [];
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.state === DroneState.DEAD || d.type !== DroneType.TEST_ENTITY) continue;

      if ((d as any).isFrozen) {
        if (d.body) {
          const trans = d.body.translation();
          d.posX = trans.x;
          d.posY = trans.y;
          d.posZ = trans.z;
        }
        let currentCollisions: string[] = [];
        if (d.kcc && d.collider) {
           const numCollisions = d.kcc.numComputedCollisions();
           for (let c=0; c<numCollisions; c++) {
              const col = d.kcc.computedCollision(c);
              if (col && col.collider) {
                 for (const p of this.players.values()) {
                    if (p.collider && p.collider.handle === col.collider.handle) {
                       currentCollisions.push(p.id);
                    }
                 }
              }
           }
        }
        const historyRecord = {
           time: Date.now(),
           targetX: d.targetX,
           targetY: d.targetY,
           targetZ: d.targetZ,
           steerX: 0,
           steerZ: 0,
           velX: 0,
           velZ: 0,
           posX: d.posX,
           posZ: d.posZ,
           headingX: 1,
           headingZ: 0
        };
        if (!(d as any).history) (d as any).history = [];
        (d as any).history.push(historyRecord);
        if ((d as any).history.length > 20) (d as any).history.shift();

        telemetry.push({ id: d.id, history: (d as any).history, mode: d.mode, coll: d.collider ? d.collider.collisionGroups() : 0, collisions: currentCollisions });
        continue;
      }
      
      if (d.currentVelocityX !== undefined) {
        const dxToTarget = d.targetX - d.posX;
        const dyToTarget = d.targetY - d.posY;
        const dzToTarget = d.targetZ - d.posZ;
        const distToTarget = Math.sqrt(dxToTarget*dxToTarget + dyToTarget*dyToTarget + dzToTarget*dzToTarget);

        let steerX = distToTarget > 0.1 ? (dxToTarget / distToTarget) : 0;
        let steerY = distToTarget > 0.1 ? (dyToTarget / distToTarget) : 0;
        let steerZ = distToTarget > 0.1 ? (dzToTarget / distToTarget) : 0;

        const maxSpeed = 10.0;
        const targetSpeed = distToTarget > 1.0 ? maxSpeed : (distToTarget * maxSpeed);

        const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
        const maxAccelPerTick = 0.4;
        
        const desiredVx = steerX * targetSpeed;
        const desiredVy = steerY * targetSpeed;
        const desiredVz = steerZ * targetSpeed;

        d.currentVelocityX += clamp(desiredVx - d.currentVelocityX, -maxAccelPerTick, maxAccelPerTick);
        d.currentVelocityY += clamp(desiredVy - d.currentVelocityY, -maxAccelPerTick, maxAccelPerTick);
        d.currentVelocityZ += clamp(desiredVz - d.currentVelocityZ, -maxAccelPerTick, maxAccelPerTick);

        const desiredTx = d.currentVelocityX * 0.0166;
        const desiredTy = d.currentVelocityY * 0.0166;
        const desiredTz = d.currentVelocityZ * 0.0166;

        let currentCollisions: string[] = [];
        if (d.kcc && d.body && d.collider) {
           d.kcc.computeColliderMovement(
             d.collider,
             { x: desiredTx, y: desiredTy, z: desiredTz },
             RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
             undefined,
             undefined
           );
           const movement = d.kcc.computedMovement();
           d.posX += movement.x;
           d.posY += movement.y;
           d.posZ += movement.z;

           d.body.setNextKinematicTranslation({
             x: d.posX,
             y: d.posY,
             z: d.posZ
           });

           const numCollisions = d.kcc.numComputedCollisions();
           for (let c=0; c<numCollisions; c++) {
              const col = d.kcc.computedCollision(c);
              if (col && col.collider) {
                 for (const p of this.players.values()) {
                    if (p.collider && p.collider.handle === col.collider.handle) {
                       currentCollisions.push(p.id);
                    }
                 }
              }
           }
        } else {
           d.posX += desiredTx;
           d.posY += desiredTy;
           d.posZ += desiredTz;
        }

        const hLen = Math.sqrt(d.currentVelocityX**2 + d.currentVelocityZ**2);
        if (hLen > 0.01) {
           d.currentHeadingX = d.currentVelocityX / hLen;
           d.currentHeadingZ = d.currentVelocityZ / hLen;
        }
        
        d.rotY = Math.atan2(d.currentHeadingX, d.currentHeadingZ);
        d.rotW = Math.cos(d.rotY / 2);
        d.rotY = Math.sin(d.rotY / 2);
        d.rotX = 0;
        d.rotZ = 0;

        const historyRecord = {
           time: Date.now(),
           targetX: d.targetX,
           targetY: d.targetY,
           targetZ: d.targetZ,
           steerX: steerX,
           steerZ: steerZ,
           velX: d.currentVelocityX,
           velZ: d.currentVelocityZ,
           posX: d.posX,
           posZ: d.posZ,
           headingX: d.currentHeadingX,
           headingZ: d.currentHeadingZ
        };

        if (!(d as any).history) (d as any).history = [];
        (d as any).history.push(historyRecord);
        if ((d as any).history.length > 20) (d as any).history.shift();

        telemetry.push({ id: d.id, history: (d as any).history, mode: d.mode, coll: d.collider ? d.collider.collisionGroups() : 0, collisions: currentCollisions });
      }
    }

    if (telemetry.length > 0) {
      this.broadcastReliableEvent({ type: "dev_test_entity_telemetry", data: telemetry });
    }
  }

  public setObjectiveHold(playerId: string, holding: boolean): void {
    const player = this.players.get(playerId);
    if (player && player.isAlive) {
      player.isHoldingObjective = holding;
      if (!holding && ACTIVE_GAMEMODE.objectiveResetOnExit) {
        player.currentObjectiveProgress = 0;
      }
    }
  }

  public useUtility(playerId: string, slot: "utility1" | "utility2") {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive || !player.utilityState) return;

    const uSlot = player.utilityState[slot];
    if (!uSlot || uSlot.charges <= 0) return;

    if (this.commanderMemory) {
      this.commanderMemory.onUtilityUsed(playerId, uSlot.id);
    }

    // Deduct charge & set cooldown
    uSlot.charges -= 1;
    if (uSlot.cooldownRemaining <= 0) {
      uSlot.cooldownRemaining = uSlot.baseCooldown;
    }

    // Send updated utility state to player
    player.channel.emit("reliable_event", {
      type: "UTILITY_STATE",
      state: player.utilityState,
    });

    // Broadcast activation confirmation (zero client prediction)
    this.broadcastReliableEvent({
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
        for (const otherPlayer of this.players.values()) {
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

        this.broadcastReliableEvent({
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
        for (const otherPlayer of this.players.values()) {
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

          this.broadcastReliableEvent({
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
        const summary = this.llmCommander?.lastCycleSummary || "NO TRANSMISSION DETECTED";
        player.channel.emit("radio_intercept", { summary });
        this.broadcastReliableEvent({
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
        for (let c = 0; c < this.cameras.length; c++) {
          const cam = this.cameras[c];
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
        this.broadcastReliableEvent({
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
        this.broadcastReliableEvent({
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
          this.broadcastReliableEvent({
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
          this.broadcastReliableEvent({
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

  private processDroneKillAssists(drone: ServerDrone, killerId: string) {
    if (!drone.damageLog || drone.damageLog.length === 0) return;
    const now = Date.now();
    const assistThresholdMs = 10000;
    const creditedAssists = new Set<string>();

    for (const entry of drone.damageLog) {
      if (entry.playerId && entry.playerId !== killerId && !creditedAssists.has(entry.playerId)) {
        if (now - entry.timestamp <= assistThresholdMs) {
          creditedAssists.add(entry.playerId);
          const assistingPlayer = this.players.get(entry.playerId);
          if (assistingPlayer) {
            assistingPlayer.stats.assists += 1;
            assistingPlayer.stats.scoreIndividual += ACTIVE_GAMEMODE.scoreValues.assistElimination || 50;
          }
        }
      }
    }
  }

  public resolveGrenadeExplosion(attackerId: string, origin: { x: number; y: number; z: number }) {
    if (this.isShutdown) return;

    // Broadcast server-authoritative explosion event
    this.broadcastReliableEvent({
      type: "UTILITY_EFFECT",
      utilityId: "Grenade",
      origin: origin,
      radius: GRENADE_RADIUS,
    });

    // Authoritative explosion damage against drones
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
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
          this.despawnDrone(d);
          const attacker = this.players.get(attackerId);
          if (attacker) {
            attacker.score += 100;
            attacker.stats.droneEliminations += 1;
            attacker.stats.scoreIndividual += 100;
          }
        }
      }
    }

    // Authoritative explosion damage against players
    for (const p of this.players.values()) {
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

  public resolveFlashbangDetonation(attackerId: string, origin: { x: number; y: number; z: number }) {
    if (this.isShutdown) return;

    this.broadcastReliableEvent({
      type: "FLASHBANG_DETONATED",
      origin: origin,
      radius: FLASHBANG_RADIUS,
    });

    for (const p of this.players.values()) {
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

  public shutdown() {
    if (this.isShutdown) return;
    this.isShutdown = true;
    this.matchActive = false;
    
    if (this.physicsInterval) clearInterval(this.physicsInterval);
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.aiInterval) clearInterval(this.aiInterval);

    // Cleanup remaining players
    for (const p of this.players.values()) {
      if (p.body) {
        try {
          this.rapierWorld.removeRigidBody(p.body);
        } catch (e) {}
      }
      // Force close channel? Plan says: "3. Disconnect Clients: Force close all Geckos.io channels"
      try {
        p.channel.emit("reliable_event", { type: "MATCH_TERMINATED", reason: "server_shutdown" });
        // Geckos channels are typically closed by the client or adapter, but we clear them here.
      } catch (e) {}
    }
    this.players.clear();
    this.colliderToEntityMap.clear();

    // Cleanup remaining drones
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.body) {
        try {
          this.rapierWorld.removeRigidBody(d.body);
        } catch (e) {}
        d.body = null;
      }
      d.collider = null;
      d.state = DroneState.DEAD;
    }

    if (this.rapierWorld) {
      try {
        this.rapierWorld.free();
        (this as any).rapierWorld = null;
      } catch (e) {
        console.error("[VEXEA SERVER] Error freeing rapierWorld:", e);
      }
    }

    // Explicitly release large TypedArrays and Pools
    (this as any).historicalAABBHistory = null;
    (this as any).projPosX = null;
    (this as any).projPosY = null;
    (this as any).projPosZ = null;
    (this as any).projVelX = null;
    (this as any).projVelY = null;
    (this as any).projVelZ = null;
    (this as any).projDamage = null;
    (this as any).projDist = null;
    (this as any).projActive = null;
    (this as any).projEnemy = null;
    (this as any).preallocatedBuffer = null;
    (this as any).zoneRegistry = null;
    (this as any).collisionMap = null;
    (this as any).specJson = null;

    // Signal Manager that teardown is complete
    if (this.onShutdown) {
      this.onShutdown(this.roomId);
    }
  }
}
