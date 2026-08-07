import { DroneType, getDroneMuzzleWorldPosition, DRONE_CONFIGS, INTEL_CONFIGS } from "../../shared/constants";
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

  const sensorPos = { x: drone.posX, y: drone.posY + 0.5, z: drone.posZ };
  const dx = player.posX - sensorPos.x;
  const dy = (player.posY + 0.5) - sensorPos.y;
  const dz = player.posZ - sensorPos.z;
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
    hasLOS = true;
    const rDir = { x: dx / dist, y: dy / dist, z: dz / dist };

    if (collisionMap && collisionMap.rayIntersectsAny(sensorPos, rDir, dist)) {
      hasLOS = false;
    }

    if (hasLOS && rapierWorld && RAPIER_MOD) {
      const rapierRay = new RAPIER_MOD.Ray(sensorPos, rDir);
      const hit = rapierWorld.castRay(
        rapierRay,
        dist,
        true,
        RAPIER_MOD.QueryFilterFlags.EXCLUDE_DYNAMIC,
        undefined,
        drone.collider || undefined,
        player.body || undefined
      );
      if (hit && hit.timeOfImpact < dist - 0.1) {
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
