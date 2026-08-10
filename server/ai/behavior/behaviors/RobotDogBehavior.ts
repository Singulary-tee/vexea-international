import { DroneType, DRONE_CONFIGS, INTEL_CONFIGS, WAYPOINTS } from "../../../../shared/constants";
import { BehaviorContext, BehaviorOutput } from "../types";
import { UNKNOWN_THRESHOLD } from "../../DroneMemory";

export function robotDogBehavior(drone: any, ctx: BehaviorContext, out: BehaviorOutput) {
  const intel = INTEL_CONFIGS[DroneType.ROBOT_DOG];
  const conf = DRONE_CONFIGS[DroneType.ROBOT_DOG];

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
      // Too close — circle-strafe (perpendicular to target)
      const perpX = -dz / dist;
      const perpZ = dx / dist;
      out.steerX = perpX;
      out.steerZ = perpZ;
      out.targetSpeed = conf.speed;
    } else if (dist >= intel.engagementMin && dist <= intel.engagementMax && hasLOS) {
      // IN RANGE — pursue while firing (don't stop)
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed * 0.7; // slow approach while firing
      out.shouldFire = true;
    } else {
      // CHASE — full speed toward target
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed;
    }

    // Nimble stair climbing: include Y steering
    // The controller's ground physics will handle KCC stepping
    drone.targetY = target.y; // hint for Y stabilization if controller supports it
  } else {
    // NORMAL — investigate then patrol
    const investigateTarget = findBestMemoryTarget(drone);
    if (investigateTarget) {
      const dx = investigateTarget.x - drone.posX;
      const dz = investigateTarget.z - drone.posZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 2.0) {
        out.steerX = dx / dist;
        out.steerZ = dz / dist;
        out.targetSpeed = conf.speed * 0.7;
      }
    } else {
      const wp = WAYPOINTS[drone.zone as keyof typeof WAYPOINTS] || WAYPOINTS.zone_spawn;
      const dx = wp.x - drone.posX;
      const dz = wp.z - drone.posZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.1) {
        out.steerX = dx / dist;
        out.steerZ = dz / dist;
        out.targetSpeed = conf.speed * 0.6;
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
