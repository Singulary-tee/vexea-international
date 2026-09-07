import RAPIER from "@dimforge/rapier3d-compat";
import { ChannelAdapter } from "../transport/adapter";
import {
  DroneState,
  DroneType,
  ZoneName,
  TOPOLOGY,
  BehaviorProfile,
  getWeaponPerformance,
  TOTAL_STATE_BUFFER_SIZE,
  HEADER_SIZE,
  DRONE_STRUCT_SIZE,
  CAMERA_STRUCT_SIZE,
  MAX_DRONES,
  isRuntimeWeaponId,
} from "../../shared/constants";
import { ClassId } from "../../shared/classes";
import type { WeaponId } from "../../shared/weapons";
import { PlayerUtilityState } from "../../shared/utilities";
import { MemoryRecord } from "../ai/DroneIntelligence";
import { Posture } from "../ai/GroupTacticalState";
import { createMemoryMap } from "../ai/DroneMemory";

export type { ChannelAdapter, Posture };
export { isRuntimeWeaponId, createMemoryMap };
export { TOTAL_STATE_BUFFER_SIZE as CONST_BUFFER_SIZE, HEADER_SIZE, DRONE_STRUCT_SIZE, CAMERA_STRUCT_SIZE, MAX_DRONES };

export const MAX_PROJECTILES = 200;
export const HISTORICAL_SAMPLES_MAX = 120;
export const BASE_DETECTION_DISTANCE = 3.0;
export const DETECTION_TIME_HORIZON = 0.5;
export const MIN_AVOIDANCE_TICKS = 30;
export const HISTORIC_BLOCK_SIZE = 2 + MAX_DRONES * 4;
export const DEBUG_PHYSICS_TICKS = false;

export type WeaponSlot = "primary" | "secondary";
export type WeaponSlotState = PlayerState["weaponState"][WeaponSlot];

export function getResolvedWeaponPerformance(weaponId: WeaponId) {
  return getWeaponPerformance(weaponId) || getWeaponPerformance("rifle")!;
}

export function getWeaponReserveCapacity(weaponId: WeaponId): number {
  const performance = getResolvedWeaponPerformance(weaponId);
  return performance.reserveCapacity ?? performance.capacity;
}

export function getWeaponReloadTicks(weaponId: WeaponId): number {
  const performance = getResolvedWeaponPerformance(weaponId);
  return Math.max(1, Math.ceil(performance.visualConfig.reloadDuration * 60));
}

export function resetWeaponSlotState(state: WeaponSlotState, weaponId: WeaponId): void {
  const performance = getResolvedWeaponPerformance(weaponId);
  state.weaponId = weaponId;
  state.currentMag = performance.capacity;
  state.reserve = getWeaponReserveCapacity(weaponId);
  state.isReloading = false;
  state.reloadTimer = 0;
  state.leakyBucket = 0;
  state.lastConfirmedShotT = 0;
}

export function applyWeaponReload(state: WeaponSlotState): void {
  const performance = getResolvedWeaponPerformance(state.weaponId);
  const needed = performance.capacity - state.currentMag;
  const taken = Math.min(needed, state.reserve);
  state.currentMag += taken;
  state.reserve -= taken;
}

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
  weapon?: WeaponId;
  weaponState: {
    primary: {
      weaponId: WeaponId;
      currentMag: number;
      reserve: number;
      isReloading: boolean;
      reloadTimer: number;
      fireMode: "auto" | "burst";
      lastConfirmedShotT: number;
      leakyBucket: number;
    };
    secondary: {
      weaponId: WeaponId;
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
  lastInputChangeTime: number;
  afkWarningIssued: boolean;

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
  botActionId?: number; // 0=idle/nav, 1=combat, 2=objective
  botTargetId?: string; // nearest drone id or ""
  botTargetDist?: number;
  botFireCooldown?: number; // ticks until next shot
  botAimYaw?: number;
  botAimPitch?: number;

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
  zone?: ZoneName;
}

export interface ServerDrone {
  id: number;
  type: DroneType;
  state: DroneState;
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
  avoidanceState?: {
    active: boolean;
    direction: number;
    ticksRemaining: number;
    transitionX?: number;
    transitionZ?: number;
  } | null;
  stuckTicks?: number;
  fixedWingPhase?: "APPROACH" | "RUN" | "EXIT" | "REPOSITION";
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
  parkedOrder: {
    type: "move" | "hold";
    targetZone: ZoneName;
    path: ZoneName[];
    pathIndex: number;
    active: boolean;
  };
  strafeRunTarget?: ZoneName | null;
  gearActionId: number;
  gearActionScore: number;
  gearLastPosture: string;
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

export type LiveZoneSummary = ServerZoneState;

export const astarPath = (start: ZoneName, end: ZoneName): ZoneName[] => {
  if (start === end) return [start];

  const queue: ZoneName[][] = [[start]];
  const visited = new Set<ZoneName>([start]);

  while (queue.length > 0) {
    const currentPath = queue.shift()!;
    const lastNode = currentPath[currentPath.length - 1];
    if (lastNode === end) return currentPath;

    const neighbors = TOPOLOGY[lastNode];
    if (!neighbors) continue;
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
