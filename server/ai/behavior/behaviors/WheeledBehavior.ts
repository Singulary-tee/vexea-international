import { DroneType, DRONE_CONFIGS, INTEL_CONFIGS, WAYPOINTS } from "../../../../shared/constants";
import { BehaviorContext, BehaviorOutput } from "../types";
import { UNKNOWN_THRESHOLD } from "../../DroneMemory";

export function wheeledBehavior(drone: any, ctx: BehaviorContext, out: BehaviorOutput) {
  const intel = INTEL_CONFIGS[DroneType.WHEELED];
  const conf = DRONE_CONFIGS[DroneType.WHEELED];

  if (drone.mode === "COMBAT" && drone.combatTarget) {
    const target = drone.combatTarget.lastSensedPosition;
    const dx = target.x - drone.posX;
    const dy = target.y - drone.posY;
    const dz = target.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Check LOS
    const sensorPos = { x: drone.posX, y: drone.posY + 0.5, z: drone.posZ };
    const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
    const hasLOS = ctx.room.collisionMap ? !ctx.room.collisionMap.rayIntersectsAny(sensorPos, dir, dist) : true;

    if (dist < intel.engagementMin) {
      // Too close — retreat to engagementMin + 5m buffer
      out.steerX = -dx / dist;
      out.steerZ = -dz / dist;
      out.targetSpeed = conf.speed;
    } else if (dist >= intel.engagementMin && dist <= intel.engagementMax && hasLOS) {
      // HOLD POSITION — turret handles aiming via getDroneMuzzleWorldPosition
      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
      out.shouldFire = true;
      // Body heading stays as-is; do not force rotation toward target
      out.forceHeadingX = drone.currentHeadingX;
      out.forceHeadingZ = drone.currentHeadingZ;
    } else {
      // APPROACH to optimal range
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed;
    }
  } else {
    // NORMAL — patrol, but investigate last seen first
    const investigateTarget = findBestMemoryTarget(drone);
    if (investigateTarget) {
      const dx = investigateTarget.x - drone.posX;
      const dz = investigateTarget.z - drone.posZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 2.0) {
        out.steerX = dx / dist;
        out.steerZ = dz / dist;
        out.targetSpeed = conf.speed * 0.6;
      } else {
        // Arrived at last known position, hold and scan
        out.steerX = 0;
        out.steerZ = 0;
        out.targetSpeed = 0;
      }
    } else {
      // Patrol waypoint
      const wp = WAYPOINTS[drone.zone as keyof typeof WAYPOINTS] || WAYPOINTS.zone_spawn;
      const dx = wp.x - drone.posX;
      const dz = wp.z - drone.posZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.1) {
        out.steerX = dx / dist;
        out.steerZ = dz / dist;
        out.targetSpeed = conf.speed * 0.5;
      }
    }
  }
}

function findBestMemoryTarget(drone: any) {
  let best = null;
  let bestConf = 0;
  if (drone.memoryRecords) {
    for (const record of drone.memoryRecords.values()) {
      if (record.confidence > bestConf && record.confidence > UNKNOWN_THRESHOLD) {
        bestConf = record.confidence;
        best = record.lastSensedPosition;
      }
    }
  }
  return best;
}
