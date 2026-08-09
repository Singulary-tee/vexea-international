import { DroneType, DRONE_CONFIGS, INTEL_CONFIGS, WAYPOINTS } from "../../../../shared/constants";
import { BehaviorContext, BehaviorOutput } from "../types";

export function fixedWingBehavior(drone: any, ctx: BehaviorContext, out: BehaviorOutput) {
  const intel = INTEL_CONFIGS[DroneType.FIXED_WING];
  const conf = DRONE_CONFIGS[DroneType.FIXED_WING];

  if (!drone.fixedWingPhase) drone.fixedWingPhase = "APPROACH";

  if (drone.mode === "COMBAT" && drone.combatTarget) {
    const target = drone.combatTarget.lastSensedPosition;
    const dx = target.x - drone.posX;
    const dz = target.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const targetDirX = dx / dist;
    const targetDirZ = dz / dist;

    // Heading dot product with target direction
    const hLen = Math.sqrt(drone.currentHeadingX ** 2 + drone.currentHeadingZ ** 2) || 1;
    const hx = drone.currentHeadingX / hLen;
    const hz = drone.currentHeadingZ / hLen;
    const dot = hx * targetDirX + hz * targetDirZ;

    const strafeApproachDistance = conf.strafeApproachDistance ?? 150;
    const strafeRunStartDistance = conf.strafeRunStartDistance ?? 100;
    const strafeExitDistance = conf.strafeExitDistance ?? 50;
    const strafeRepositionDistance = conf.strafeRepositionDistance ?? 200;

    switch (drone.fixedWingPhase) {
      case "APPROACH": {
        out.steerX = targetDirX;
        out.steerZ = targetDirZ;
        out.targetSpeed = conf.speed;
        // Transition to RUN when within strafeRunStartDistance and aligned within 15° (cos > 0.966)
        if (dist <= strafeRunStartDistance && dot > 0.966) {
          drone.fixedWingPhase = "RUN";
        }
        break;
      }
      case "RUN": {
        // Maintain current heading, do not steer toward target
        out.steerX = hx;
        out.steerZ = hz;
        out.targetSpeed = conf.speed;
        out.shouldFire = true; // fire during strafing run
        // Transition to EXIT when past target (dot < 0) by strafeExitDistance
        if (dot < 0 && dist > strafeExitDistance) {
          drone.fixedWingPhase = "EXIT";
        }
        break;
      }
      case "EXIT": {
        // Steer away from target at 45° bank
        // Compute away vector, then rotate 45° left or right based on current heading
        const awayX = -targetDirX;
        const awayZ = -targetDirZ;
        const sin45 = 0.70710678;
        const cos45 = 0.70710678;
        // Rotate away vector by 45° around current heading direction
        out.steerX = awayX * cos45 - awayZ * sin45;
        out.steerZ = awayX * sin45 + awayZ * cos45;
        out.targetSpeed = conf.speed;
        // Transition to REPOSITION when far enough
        if (dist >= strafeRepositionDistance) {
          drone.fixedWingPhase = "REPOSITION";
        }
        break;
      }
      case "REPOSITION": {
        // Wide arc: steer toward a point 100m perpendicular to target direction
        const sideX = -targetDirZ; // perpendicular
        const sideZ = targetDirX;
        const arcTargetX = target.x + sideX * 100;
        const arcTargetZ = target.z + sideZ * 100;
        const adx = arcTargetX - drone.posX;
        const adz = arcTargetZ - drone.posZ;
        const aDist = Math.sqrt(adx * adx + adz * adz);
        if (aDist > 0.1) {
          out.steerX = adx / aDist;
          out.steerZ = adz / aDist;
        }
        out.targetSpeed = conf.speed;
        // Transition back to APPROACH when aligned toward target
        const arcDot = (adx / (aDist || 1)) * targetDirX + (adz / (aDist || 1)) * targetDirZ;
        if (arcDot > 0.7 && dist > strafeApproachDistance * 0.8) {
          drone.fixedWingPhase = "APPROACH";
        }
        break;
      }
    }
  } else {
    // NORMAL: patrol waypoints at high speed, wide turns
    const wp = WAYPOINTS[drone.zone as keyof typeof WAYPOINTS] || WAYPOINTS.zone_spawn;
    const dx = wp.x - drone.posX;
    const dz = wp.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.1) {
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed;
    }
  }
}
