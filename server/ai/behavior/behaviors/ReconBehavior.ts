import { DroneType, DRONE_CONFIGS, INTEL_CONFIGS, WAYPOINTS } from "../../../../shared/constants";
import { BehaviorContext, BehaviorOutput } from "../types";

export function reconBehavior(drone: any, ctx: BehaviorContext, out: BehaviorOutput) {
  const intel = INTEL_CONFIGS[DroneType.RECON];
  const conf = DRONE_CONFIGS[DroneType.RECON];

  const groupPosture = ctx.getGroupPosture(drone.groupId) || "RECON";
  drone.posture = groupPosture;

  if (drone.mode === "COMBAT" && drone.combatTarget) {
    const target = drone.combatTarget.lastSensedPosition;
    const dx = target.x - drone.posX;
    const dy = target.y - drone.posY;
    const dz = target.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Check LOS
    const sensorPos = { x: drone.posX, y: drone.posY + 0.5, z: drone.posZ };
    const dir = { x: dx / (dist || 1), y: dy / (dist || 1), z: dz / (dist || 1) };
    const hasLOS = ctx.room.collisionMap
      ? !ctx.room.collisionMap.rayIntersectsAny(sensorPos, dir, dist)
      : true;

    if (dist < intel.engagementMin) {
      // RETREAT — steer directly away
      out.steerX = -dx / dist;
      out.steerZ = -dz / dist;
      out.targetSpeed = conf.speed;
    } else if (dist >= intel.engagementMin && dist <= intel.engagementMax && hasLOS) {
      // ORBIT — steer perpendicular to target with sinusoidal oscillation
      // Perpendicular vectors: (-dz, dx) and (dz, -dx)
      const time = ctx.nowMs / 1000;
      const orbitPhase = Math.sin(time * Math.PI); // oscillates -1 to 1 over 2 seconds
      const perpX = -dz / dist;
      const perpZ = dx / dist;

      // Blend perpendicular with slight toward-target bias to maintain distance
      out.steerX = perpX * orbitPhase + (dx / dist) * 0.2;
      out.steerZ = perpZ * orbitPhase + (dz / dist) * 0.2;
      out.targetSpeed = conf.speed * 0.6; // orbit at reduced speed

      // Erratic Y hover: ±2m sinusoidal offset
      const targetY = target.y + Math.sin(time * 3) * 2;
      drone.targetY = targetY;
      const dyHover = targetY - drone.posY;
      out.steerY = Math.max(-1, Math.min(1, dyHover));
    } else {
      // APPROACH
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed;
    }
    out.forceHeadingX = dx / (dist || 1);
    out.forceHeadingZ = dz / (dist || 1);
  } else {
    // PATROL at high altitude
    const wp = WAYPOINTS[drone.zone as keyof typeof WAYPOINTS] || WAYPOINTS.zone_spawn;
    const dx = wp.x - drone.posX;
    const dz = wp.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.1) {
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed * 0.7;
    }
    drone.targetY = wp.y + 8; // high altitude patrol
    const dyHover = drone.targetY - drone.posY;
    out.steerY = Math.max(-1, Math.min(1, dyHover));
    out.forceHeadingX = out.steerX;
    out.forceHeadingZ = out.steerZ;
  }
}
