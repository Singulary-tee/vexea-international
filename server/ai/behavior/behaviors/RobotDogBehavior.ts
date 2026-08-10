import { DroneType, DRONE_CONFIGS, INTEL_CONFIGS, WAYPOINTS } from "../../../../shared/constants";
import { BehaviorContext, BehaviorOutput } from "../types";
import { UNKNOWN_THRESHOLD } from "../../DroneMemory";

const INVESTIGATE_ARRIVAL_RADIUS = 2.0;
const PATROL_SPEED_MULT = 0.6;
const INVESTIGATE_SPEED_MULT = 0.7;
const WAYPOINT_ARRIVAL_THRESHOLD = 0.1;

export function robotDogBehavior(drone: any, ctx: BehaviorContext, out: BehaviorOutput) {
  const intel = INTEL_CONFIGS[DroneType.ROBOT_DOG];
  const conf = DRONE_CONFIGS[DroneType.ROBOT_DOG];

  const groupPosture = ctx.getGroupPosture(drone.groupId) || "ASSAULT";
  drone.posture = groupPosture;

  if (groupPosture === "HOLD") {
    out.steerX = 0;
    out.steerZ = 0;
    out.targetSpeed = 0;
    if (drone.mode === "COMBAT" && drone.combatTarget) {
      out.shouldFire = true;
      const target = drone.combatTarget.lastSensedPosition;
      const dx = target.x - drone.posX;
      const dz = target.z - drone.posZ;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      out.forceHeadingX = dx / dist;
      out.forceHeadingZ = dz / dist;
    }
    return;
  }

  if (drone.mode === "COMBAT" && drone.combatTarget) {
    const target = drone.combatTarget.lastSensedPosition;
    const dx = target.x - drone.posX;
    const dy = target.y - drone.posY;
    const dz = target.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < intel.engagementMin) {
      // Too close — circle-strafe (perpendicular to target)
      out.steerX = -dz / dist;
      out.steerZ = dx / dist;
      out.targetSpeed = conf.speed;
      out.forceHeadingX = dx / dist;
      out.forceHeadingZ = dz / dist;
    } else if (dist >= intel.engagementMin && dist <= intel.engagementMax) {
      // IN RANGE — pursue while firing (full speed)
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed;
      out.shouldFire = true;
      out.forceHeadingX = dx / dist;
      out.forceHeadingZ = dz / dist;
    } else {
      // CHASE — full speed toward target
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed;
      out.forceHeadingX = dx / dist;
      out.forceHeadingZ = dz / dist;
    }
  } else {
    // NORMAL — investigate then patrol
    const investigateTarget = findBestMemoryTarget(drone);
    if (investigateTarget) {
      const dx = investigateTarget.x - drone.posX;
      const dz = investigateTarget.z - drone.posZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > INVESTIGATE_ARRIVAL_RADIUS) {
        out.steerX = dx / dist;
        out.steerZ = dz / dist;
        out.targetSpeed = conf.speed * INVESTIGATE_SPEED_MULT;
      }
    } else {
      const wp = WAYPOINTS[drone.zone as keyof typeof WAYPOINTS] || WAYPOINTS.zone_spawn;
      const dx = wp.x - drone.posX;
      const dz = wp.z - drone.posZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > WAYPOINT_ARRIVAL_THRESHOLD) {
        out.steerX = dx / dist;
        out.steerZ = dz / dist;
        out.targetSpeed = conf.speed * PATROL_SPEED_MULT;
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
