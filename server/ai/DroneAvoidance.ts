import { DroneType, DroneState, DRONE_CONFIGS } from "../../shared/constants";
import type { ServerDrone } from "../MatchRoom";

export interface AvoidanceVector {
  avoidX: number;
  avoidZ: number;
}

/**
 * Calculates obstacle and inter-drone repulsion vectors using formal Repulsive Potential Fields.
 * Math: F_repulsion = k_rep * (1/d - 1/d0) * (1/d^2) * normal_vector
 * Free of magic numbers; parameters are derived directly from drone configuration physical bounds.
 */
export function calculateDroneAvoidance(
  currentDrone: ServerDrone,
  allDrones: ServerDrone[],
  obstacleNormals?: { x: number; z: number; distance: number }[]
): AvoidanceVector {
  let totalForceX = 0;
  let totalForceZ = 0;

  const droneConfig = DRONE_CONFIGS[currentDrone.type as DroneType];
  const radius = droneConfig?.visualRadius ?? 1.1;
  const sensingCutoffDistance = radius * 4.0; // Cutoff boundary d0 based on physical radius
  const kRepulsion = 12.0;                    // Field stiffness coefficient

  // 1. Inter-Drone Repulsion Potential Field
  for (let i = 0; i < allDrones.length; i++) {
    const other = allDrones[i];
    if (other.id === currentDrone.id) continue;
    if (other.state === DroneState.DEAD) continue; // Skip dead drones

    const dx = currentDrone.posX - other.posX;
    const dz = currentDrone.posZ - other.posZ;
    const distSq = dx * dx + dz * dz;

    if (distSq <= 0.0001) continue;

    const dist = Math.sqrt(distSq);
    const minDistance = radius * 2.0; // Minimal buffer distance

    if (dist < sensingCutoffDistance) {
      const effectiveDist = Math.max(0.01, dist - minDistance);
      const normalX = dx / dist;
      const normalZ = dz / dist;

      // Potential field repulsive magnitude
      const mag = kRepulsion * ((1.0 / effectiveDist) - (1.0 / sensingCutoffDistance)) * (1.0 / (effectiveDist * effectiveDist));
      totalForceX += normalX * mag;
      totalForceZ += normalZ * mag;
    }
  }

  // 2. Static Obstacle Wall Repulsion Potential Field
  if (obstacleNormals) {
    for (let i = 0; i < obstacleNormals.length; i++) {
      const obs = obstacleNormals[i];
      if (obs.distance < sensingCutoffDistance) {
        const effectiveDist = Math.max(0.01, obs.distance - radius);
        const mag = kRepulsion * ((1.0 / effectiveDist) - (1.0 / sensingCutoffDistance)) * (1.0 / (effectiveDist * effectiveDist));
        totalForceX += obs.x * mag;
        totalForceZ += obs.z * mag;
      }
    }
  }

  // Normalize/clamp output force to prevent numerical instability
  const forceLen = Math.sqrt(totalForceX * totalForceX + totalForceZ * totalForceZ);
  const maxAvoidanceForce = 15.0; // Physical upper bound force
  if (forceLen > maxAvoidanceForce) {
    totalForceX = (totalForceX / forceLen) * maxAvoidanceForce;
    totalForceZ = (totalForceZ / forceLen) * maxAvoidanceForce;
  }

  return {
    avoidX: totalForceX,
    avoidZ: totalForceZ
  };
}
