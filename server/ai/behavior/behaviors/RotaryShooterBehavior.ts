import { DroneType, DroneState, DRONE_CONFIGS, INTEL_CONFIGS, WAYPOINTS } from "../../../../shared/constants";
import { BehaviorContext, BehaviorOutput } from "../types";

export function rotaryShooterBehavior(drone: any, ctx: BehaviorContext, out: BehaviorOutput) {
  const intel = INTEL_CONFIGS[DroneType.ROTARY_SHOOTER];
  const conf = DRONE_CONFIGS[DroneType.ROTARY_SHOOTER];

  const groupPosture = ctx.getGroupPosture(drone.groupId) || "HARASS";
  drone.posture = groupPosture;

  if (drone.mode === "COMBAT" && drone.combatTarget) {
    const target = drone.combatTarget.lastSensedPosition;
    const dx = target.x - drone.posX;
    const dy = target.y - drone.posY;
    const dz = target.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < intel.engagementMin) {
      // RETREAT — steer directly away without inverting vectors
      out.steerX = -dx / dist;
      out.steerZ = -dz / dist;
      out.targetSpeed = conf.speed;
      out.nextState = DroneState.PURSUING;
    } else if (dist >= intel.engagementMin && dist <= intel.engagementMax) {
      // HOLD AND FIRE — zero steering, hover
      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
      out.shouldFire = true;
      out.nextState = DroneState.ATTACKING;
    } else {
      // APPROACH
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed;
      out.nextState = DroneState.PURSUING;
    }

    // Target height Y adjustment
    const targetY = target.y + 2.0; // maintain hovering altitude above target
    const dyHover = targetY - drone.posY;
    out.steerY = Math.max(-1, Math.min(1, dyHover));

    out.forceHeadingX = dx / (dist || 1);
    out.forceHeadingZ = dz / (dist || 1);
  } else {
    // PATROL — steer toward current zone or path waypoint
    out.nextState = DroneState.PATROLLING;
    let wp = WAYPOINTS[drone.zone];
    if (drone.path && drone.path.length > 0 && drone.pathIndex < drone.path.length) {
      const targetZone = drone.path[drone.pathIndex];
      const subWp = WAYPOINTS[targetZone];
      const subDx = subWp.x - drone.posX;
      const subDz = subWp.z - drone.posZ;
      if (subDx * subDx + subDz * subDz < 9.0) {
        drone.pathIndex = Math.min(drone.pathIndex + 1, drone.path.length - 1);
      }
      wp = WAYPOINTS[drone.path[drone.pathIndex]];
    }

    const dx = wp.x - drone.posX;
    const dz = wp.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.1) {
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed * 0.5; // patrol at half speed
    } else {
      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
    }
    out.steerY = 0;
    out.forceHeadingX = out.steerX;
    out.forceHeadingZ = out.steerZ;
  }
}
