import { BehaviorOutput } from "./types";

export function computeGroundSteering(
  drone: any,
  targetX: number,
  targetZ: number,
  out: BehaviorOutput,
  config: { speed: number; decelerationRadius?: number; minSpeed?: number }
) {
  const dx = targetX - drone.posX;
  const dz = targetZ - drone.posZ;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist > 0.1) {
    out.steerX = dx / dist;
    out.steerZ = dz / dist;
  } else {
    out.steerX = 0;
    out.steerZ = 0;
  }
  out.steerY = 0;

  const decelRadius = config.decelerationRadius ?? 5.0;
  const maxSpeed = config.speed;
  const minSpeed = config.minSpeed ?? 0.0;
  const desiredSpeed = dist < 0.1 ? 0.0 : (dist < decelRadius ? maxSpeed * (dist / decelRadius) : maxSpeed);
  out.targetSpeed = Math.max(minSpeed, desiredSpeed);
}

export function applyGroundPhysics(
  drone: any,
  out: BehaviorOutput,
  dt: number,
  config: { speed: number; maxAccelPerTick?: number }
) {
  const maxAccelPerTick = config.maxAccelPerTick ?? 0.4;
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const speedVel = Math.sqrt(drone.currentVelocityX * drone.currentVelocityX + drone.currentVelocityZ * drone.currentVelocityZ);
  const nextSpeed = speedVel + clamp(out.targetSpeed - speedVel, -maxAccelPerTick, maxAccelPerTick);

  drone.currentVelocityX = drone.currentHeadingX * nextSpeed;
  drone.currentVelocityZ = drone.currentHeadingZ * nextSpeed;

  // Apply gravity
  drone.currentVelocityY += -18.0 * dt;
  if (drone.currentVelocityY < -40.0) {
    drone.currentVelocityY = -40.0;
  }
}

export function checkGrounded(drone: any, kcc: any) {
  if (kcc && kcc.computedGrounded && kcc.computedGrounded()) {
    drone.currentVelocityY = 0;
  }
}
