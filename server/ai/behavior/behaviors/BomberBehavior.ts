import { DroneType, DroneState, DRONE_CONFIGS, INTEL_CONFIGS, WAYPOINTS } from "../../../../shared/constants";
import { BehaviorContext, BehaviorOutput } from "../types";

export function bomberBehavior(drone: any, ctx: BehaviorContext, out: BehaviorOutput) {
  const conf = DRONE_CONFIGS[DroneType.BOMBER];

  if (drone.mode === "COMBAT" && drone.combatTarget) {
    if (!drone.bomberState) {
      drone.bomberState = "SEEKING";
    }

    const target = drone.combatTarget.lastSensedPosition;
    const dx = target.x - drone.posX;
    const dy = target.y - drone.posY;
    const dz = target.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (drone.bomberState === "SEEKING") {
      drone.bomberState = "LOCKED";
      drone.bomberLockTime = ctx.room.serverTick;
      out.nextState = DroneState.PURSUING;
    } else if (drone.bomberState === "LOCKED") {
      if (ctx.room.serverTick - (drone.bomberLockTime || 0) > 20) {
        drone.bomberState = "COMMITTED";
      }
      out.nextState = DroneState.PURSUING;
    } else if (drone.bomberState === "COMMITTED") {
      const detRadius = conf.detonationTriggerRadius ?? 4.0;
      if (dist < detRadius) {
        ctx.room.applyExplosionDamage(
          { x: drone.posX, y: drone.posY, z: drone.posZ },
          detRadius,
          conf.damage,
          drone.id.toString(),
          "drone"
        );
        out.nextState = DroneState.DEAD;
        if (ctx.room.despawnDrone) {
          ctx.room.despawnDrone(drone);
        }
        return;
      }
      out.nextState = DroneState.PURSUING;
    }

    if (dist > 0.1) {
      out.steerX = dx / dist;
      out.steerY = dy / dist;
      out.steerZ = dz / dist;
    } else {
      out.steerX = 0;
      out.steerY = 0;
      out.steerZ = 0;
    }

    out.targetSpeed = conf.speed;
    out.forceHeadingX = out.steerX;
    out.forceHeadingZ = out.steerZ;
  } else {
    // Reset bomber state when not in combat
    drone.bomberState = "SEEKING";
    drone.bomberLockTime = undefined;

    // PATROL
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
    const dy = wp.y - drone.posY;
    const dz = wp.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.1) {
      out.steerX = dx / dist;
      out.steerY = dy / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed * 0.5;
    } else {
      out.steerX = 0;
      out.steerY = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
    }
    out.forceHeadingX = out.steerX;
    out.forceHeadingZ = out.steerZ;
  }
}
