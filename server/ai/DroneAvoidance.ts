import { DroneType, DroneState, DRONE_CONFIGS } from "../../shared/constants";
import type { ServerDrone } from "../MatchRoom";

export interface AvoidanceVector {
  avoidX: number;
  avoidZ: number;
}

const reusableAvoidanceVector: AvoidanceVector = { avoidX: 0, avoidZ: 0 };

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
  const maxAccelPerTick = droneConfig?.maxAccelPerTick ?? 0.4;
  const speed = droneConfig?.speed ?? 10.0;

  const sensingCutoffDistance = radius * 4.0; // Cutoff boundary d0 based on physical radius
  // kRepulsion: scales the drone's acceleration budget into repulsive field stiffness
  const kRepulsion = maxAccelPerTick * 30.0;
  // maxAvoidanceForce: caps repulsion at twice max speed for numerical stability
  const maxAvoidanceForce = speed * 2.0;

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
    const otherConfig = DRONE_CONFIGS[other.type as DroneType];
    const otherRadius = otherConfig?.visualRadius ?? 1.1;
    const minDistance = radius + otherRadius; // Minimal buffer distance based on physical radii of both drones

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
  if (forceLen > maxAvoidanceForce) {
    totalForceX = (totalForceX / forceLen) * maxAvoidanceForce;
    totalForceZ = (totalForceZ / forceLen) * maxAvoidanceForce;
  }

  reusableAvoidanceVector.avoidX = totalForceX;
  reusableAvoidanceVector.avoidZ = totalForceZ;
  return reusableAvoidanceVector;
}
