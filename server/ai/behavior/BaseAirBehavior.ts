import { BehaviorOutput } from "./types";

export function computeAirSteering(
  drone: any,
  targetX: number,
  targetY: number,
  targetZ: number,
  out: BehaviorOutput,
  config: { speed: number; decelerationRadius?: number; maxTurnRate?: number }
) {
  const dx = targetX - drone.posX;
  const dy = targetY - drone.posY;
  const dz = targetZ - drone.posZ;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (dist > 0.1) {
    out.steerX = dx / dist;
    out.steerY = dy / dist;
    out.steerZ = dz / dist;
  } else {
    out.steerX = 0;
    out.steerY = 0;
    out.steerZ = 0;
  }

  const decelRadius = config.decelerationRadius ?? 5.0;
  const maxSpeed = config.speed;
  const desiredSpeed = dist < 0.1 ? 0.0 : (dist < decelRadius ? maxSpeed * (dist / decelRadius) : maxSpeed);
  out.targetSpeed = desiredSpeed;
}

export function stabilizeHoverY(
  drone: any,
  targetY: number,
  out: BehaviorOutput,
  config: { maxVerticalSpeed?: number }
) {
  const dy = targetY - drone.posY;
  const maxVert = config.maxVerticalSpeed ?? 5.0;
  out.steerY = Math.max(-1, Math.min(1, dy));
}

export function applyAirPhysics(
  drone: any,
  out: BehaviorOutput,
  dt: number,
  config: { speed: number; maxAccelPerTick?: number }
) {
  const maxAccelPerTick = config.maxAccelPerTick ?? 0.4;
  const maxSpeed = config.speed;

  const desiredVx = out.steerX * out.targetSpeed;
  const desiredVy = out.steerY * out.targetSpeed;
  const desiredVz = out.steerZ * out.targetSpeed;

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  drone.currentVelocityX += clamp(desiredVx - drone.currentVelocityX, -maxAccelPerTick, maxAccelPerTick);
  drone.currentVelocityY += clamp(desiredVy - drone.currentVelocityY, -maxAccelPerTick, maxAccelPerTick);
  drone.currentVelocityZ += clamp(desiredVz - drone.currentVelocityZ, -maxAccelPerTick, maxAccelPerTick);

  const curVelMag = Math.sqrt(
    drone.currentVelocityX * drone.currentVelocityX +
    drone.currentVelocityY * drone.currentVelocityY +
    drone.currentVelocityZ * drone.currentVelocityZ
  );

  if (curVelMag > maxSpeed && curVelMag > 0.001) {
    const velScale = maxSpeed / curVelMag;
    drone.currentVelocityX *= velScale;
    drone.currentVelocityY *= velScale;
    drone.currentVelocityZ *= velScale;
  }
}
