import { DroneType, getDroneMuzzleWorldPosition, DRONE_CONFIGS, INTEL_CONFIGS, TOPOLOGY, ZoneName } from "../../shared/constants";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { PlayerState, ServerDrone } from "../MatchRoom";
import { CollisionSystem } from "../../shared/collision";

export interface PerceptionResult {
  playerId: string;
  detected: boolean;           // Sight + FOV + Line-of-sight
  heard: boolean;              // Acoustic sound detection (gunshot)
  reactedToDamage: boolean;    // Recent damage log reaction
  sightConfidence: number;     // 1.0 for sight
  soundConfidence: number;     // 0.75 for sound (capped at 'last_seen')
  damageConfidence: number;    // 0.85 for damage
  targetPos: { x: number; y: number; z: number };
}

// Module-level static scratch objects to enforce Zero-GC compliance in 60Hz tick
const _sensorPos = { x: 0, y: 0, z: 0 };
const _rDir = { x: 0, y: 0, z: 0 };

/**
 * Calculates sensor optics, FOV angles, raycast LOS obstructions, and acoustic sound perception.
 * Strict mathematical modeling adhering to Architecture.md Section 11.
 */
export function evaluateDronePerception(
  drone: ServerDrone,
  player: PlayerState,
  nowMs: number,
  rapierWorld: RAPIER.World | null,
  RAPIER_MOD: typeof RAPIER | null,
  collisionMap: CollisionSystem | null = null
): PerceptionResult {
  const conf = INTEL_CONFIGS[drone.type];
  const droneConfig = DRONE_CONFIGS[drone.type as DroneType];
  const sightDistance = droneConfig?.detectionRadius ?? conf.sightDistance;
  const visionConeAngle = droneConfig?.fovHalfAngle ? (droneConfig.fovHalfAngle * 2) : conf.visionConeAngle;

  _sensorPos.x = drone.posX;
  _sensorPos.y = drone.posY + 0.5;
  _sensorPos.z = drone.posZ;

  const dx = player.posX - _sensorPos.x;
  const dy = (player.posY + 0.5) - _sensorPos.y;
  const dz = player.posZ - _sensorPos.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Stage 1: Distance Boundary
  const inDistance = dist <= sightDistance;

  // Stage 2: Vision Cone Check
  let inFOV = false;
  if (inDistance) {
    const qx = drone.rotX;
    const qy = drone.rotY;
    const qz = drone.rotZ;
    const qw = drone.rotW;

    // Local forward (+Z) rotated by orientation quaternion
    const forwardX = 2 * (qx * qz + qw * qy);
    const forwardY = 2 * (qy * qz - qw * qx);
    const forwardZ = 1 - 2 * (qx * qx + qy * qy);

    const fLen = Math.sqrt(forwardX * forwardX + forwardY * forwardY + forwardZ * forwardZ);
    const fx = fLen > 0 ? forwardX / fLen : 0;
    const fy = fLen > 0 ? forwardY / fLen : 0;
    const fz = fLen > 0 ? forwardZ / fLen : 1;

    const dirX = dist > 0 ? dx / dist : 0;
    const dirY = dist > 0 ? dy / dist : 0;
    const dirZ = dist > 0 ? dz / dist : 1;

    const dot = Math.max(-1, Math.min(1, fx * dirX + fy * dirY + fz * dirZ));
    const angle = Math.acos(dot);

    let fov = visionConeAngle;
    if (drone.type === DroneType.HUMANOID) {
      fov = Math.max(Math.PI / 6, (Math.PI / 2) * (1 - dist / sightDistance));
    }
    const halfAngle = fov / 2;
    inFOV = angle <= halfAngle;
  }

  // Stage 3: Raycast Line of Sight
  let hasLOS = false;
  if (inDistance && inFOV) {
    // Hierarchical Bounding Box Pre-Filter (ARCH-04):
    // Never run collisionMap.rayIntersectsAny before testing broad-phase line-of-sight against static zone portals.
    // If player and drone are separated by multiple non-adjacent zones, raycasting is bypassed entirely.
    const droneZone = drone.zone;
    const playerZone = player.zone;
    const areZonesConnected =
      !droneZone ||
      !playerZone ||
      droneZone === playerZone ||
      Boolean(TOPOLOGY[droneZone as ZoneName]?.includes(playerZone as ZoneName));

    if (!areZonesConnected) {
      hasLOS = false;
    } else {
      hasLOS = true;
      _rDir.x = dx / dist;
      _rDir.y = dy / dist;
      _rDir.z = dz / dist;

      if (collisionMap && collisionMap.rayIntersectsAny(_sensorPos, _rDir, dist)) {
        hasLOS = false;
      }
    }
  }

  const detected = inDistance && inFOV && hasLOS;

  // Stage 4: Acoustic Sound Perception (Gunshots)
  let heard = false;
  if (!detected && player.firedThisTick) {
    if (dist <= conf.hearingRadius) {
      heard = true;
    }
  }

  // Stage 5: Damage Reaction
  let reactedToDamage = false;
  if (!detected && !heard && drone.damageLog && drone.damageLog.length > 0) {
    const latestDamage = drone.damageLog[drone.damageLog.length - 1];
    if (latestDamage.playerId === player.id && (nowMs - latestDamage.timestamp) < 2000) {
      reactedToDamage = true;
    }
  }

  return {
    playerId: player.id,
    detected,
    heard,
    reactedToDamage,
    sightConfidence: 1.0,  // Full optical confidence -> 'confirmed'
    soundConfidence: 0.75, // Acoustic sound -> capped at 'last_seen'
    damageConfidence: 0.85, // Damage reaction -> 'last_seen'
    targetPos: { x: player.posX, y: player.posY, z: player.posZ }
  };
}
