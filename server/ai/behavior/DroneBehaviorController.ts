import RAPIER from "@dimforge/rapier3d-compat";
import {
  DroneType,
  DroneState,
  DRONE_CONFIGS,
  INTEL_CONFIGS,
  getDroneMuzzleWorldPosition,
} from "../../../shared/constants";
import { calculateDroneAvoidance } from "../DroneAvoidance";
import { BEHAVIORS } from "./index";
import { BehaviorContext, BehaviorOutput } from "./types";

const BASE_DETECTION_DISTANCE = 3.0;
const DETECTION_TIME_HORIZON = 0.5;
const MIN_AVOIDANCE_TICKS = 30;

// Zero-GC pre-allocated outputs pool
const outputPool = new Map<number, BehaviorOutput>();

export function getOrCreateOutput(droneId: number): BehaviorOutput {
  let out = outputPool.get(droneId);
  if (!out) {
    out = {
      steerX: 0,
      steerY: 0,
      steerZ: 0,
      targetSpeed: 0,
      shouldFire: false,
      nextState: null,
      forceHeadingX: 0,
      forceHeadingZ: 0,
    };
    outputPool.set(droneId, out);
  }
  return out;
}

export function resetOutput(out: BehaviorOutput) {
  out.steerX = 0;
  out.steerY = 0;
  out.steerZ = 0;
  out.targetSpeed = 0;
  out.shouldFire = false;
  out.nextState = null;
  out.forceHeadingX = 0;
  out.forceHeadingZ = 0;
}

export function initBehaviorOutputs(maxDrones: number = 50) {
  for (let i = 0; i < maxDrones; i++) {
    getOrCreateOutput(i);
  }
}

export function processDroneBehaviors(drones: any[], room: any, dt: number = 0.0166, nowMs: number) {
  const ctx: BehaviorContext = {
    room,
    dt,
    nowMs,
  };

  const sin45 = 0.70710678;
  const cos45 = 0.70710678;

  for (let i = 0; i < drones.length; i++) {
    const drone = drones[i];
    if (drone.state === DroneState.DEAD) continue;

    if ((drone as any).isFrozen) {
      if (drone.body) {
        const trans = drone.body.translation();
        drone.posX = trans.x;
        drone.posY = trans.y;
        drone.posZ = trans.z;
      }
      continue;
    }

    if (drone.state === DroneState.IDLE) {
      drone.cooldown--;
      if (drone.cooldown <= 0) {
        drone.state = DroneState.PATROLLING;
      }
      continue;
    }

    const behavior = BEHAVIORS[drone.type as DroneType];
    const out = getOrCreateOutput(drone.id);
    resetOutput(out);

    // 1 & 3. Run Behavior Function if registered
    if (behavior) {
      behavior(drone, ctx, out);
    } else {
      // Default fallback for types not yet converted
      out.targetSpeed = DRONE_CONFIGS[drone.type as DroneType]?.speed ?? 10.0;
    }

    if (drone.cooldown > 0) {
      drone.cooldown--;
    }

    const conf: any = DRONE_CONFIGS[drone.type as DroneType] || {};
    const isAir =
      drone.type === DroneType.RECON ||
      drone.type === DroneType.ROTARY_SHOOTER ||
      drone.type === DroneType.BOMBER;
    const isFixedWing = drone.type === DroneType.FIXED_WING;

    // 4. Inter-Drone Repulsion
    const interDrone = calculateDroneAvoidance(drone, drones, null);
    if (interDrone.avoidX !== 0 || interDrone.avoidZ !== 0) {
      out.steerX = out.steerX * 0.7 + interDrone.avoidX * 0.3;
      out.steerZ = out.steerZ * 0.7 + interDrone.avoidZ * 0.3;
      const mag = Math.sqrt(out.steerX * out.steerX + out.steerZ * out.steerZ);
      if (mag > 0.001) {
        out.steerX /= mag;
        out.steerZ /= mag;
      }
    }

    // 5. Static Obstacle Avoidance using EXCLUDE_DYNAMIC
    if (drone.avoidanceState === undefined) {
      drone.avoidanceState = null;
    }

    let obstacleDetected = false;
    let forwardHitDistance = 0;

    const headingLen = Math.sqrt(
      drone.currentHeadingX * drone.currentHeadingX + drone.currentHeadingZ * drone.currentHeadingZ
    );
    const dirX = headingLen > 0.001 ? drone.currentHeadingX / headingLen : 1;
    const dirZ = headingLen > 0.001 ? drone.currentHeadingZ / headingLen : 0;

    const currentSpeed = Math.sqrt(
      drone.currentVelocityX * drone.currentVelocityX +
      drone.currentVelocityY * drone.currentVelocityY +
      drone.currentVelocityZ * drone.currentVelocityZ
    );
    const detectionDistance =
      (conf.detectionRadius ?? BASE_DETECTION_DISTANCE) + currentSpeed * DETECTION_TIME_HORIZON;

    if ((drone as any).cachedObstacleDetected === undefined) {
      (drone as any).cachedObstacleDetected = false;
      (drone as any).cachedForwardHitDistance = 0;
    }

    if ((room.serverTick + drone.id) % 3 === 0) {
      if (room.rapierWorld) {
        const rayOrigin = getDroneMuzzleWorldPosition(drone);
        const rayDir = { x: dirX, y: 0, z: dirZ };
        const ray = new RAPIER.Ray(rayOrigin, rayDir);
        const hit = room.rapierWorld.castRay(
          ray,
          detectionDistance,
          true,
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS | RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
          undefined,
          drone.collider || undefined
        );

        if (hit && hit.timeOfImpact <= detectionDistance) {
          obstacleDetected = true;
          forwardHitDistance = hit.timeOfImpact;
        }
      }
      (drone as any).cachedObstacleDetected = obstacleDetected;
      (drone as any).cachedForwardHitDistance = forwardHitDistance;
    } else {
      obstacleDetected = (drone as any).cachedObstacleDetected;
      forwardHitDistance = (drone as any).cachedForwardHitDistance;
    }

    if (obstacleDetected) {
      if (!drone.avoidanceState || !drone.avoidanceState.active) {
        const probeDistance = Math.max(3.0, detectionDistance * 0.75);
        const rayOrigin = getDroneMuzzleWorldPosition(drone);

        const leftDirX = dirX * cos45 - dirZ * sin45;
        const leftDirZ = dirX * sin45 + dirZ * cos45;
        const leftRay = new RAPIER.Ray(rayOrigin, { x: leftDirX, y: 0, z: leftDirZ });
        const leftHit = room.rapierWorld
          ? room.rapierWorld.castRay(
              leftRay,
              probeDistance,
              true,
              RAPIER.QueryFilterFlags.EXCLUDE_SENSORS | RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
              undefined,
              drone.collider || undefined
            )
          : null;

        const rightDirX = dirX * cos45 + dirZ * sin45;
        const rightDirZ = -dirX * sin45 + dirZ * cos45;
        const rightRay = new RAPIER.Ray(rayOrigin, { x: rightDirX, y: 0, z: rightDirZ });
        const rightHit = room.rapierWorld
          ? room.rapierWorld.castRay(
              rightRay,
              probeDistance,
              true,
              RAPIER.QueryFilterFlags.EXCLUDE_SENSORS | RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
              undefined,
              drone.collider || undefined
            )
          : null;

        const leftClearDist = leftHit ? leftHit.timeOfImpact : probeDistance;
        const rightClearDist = rightHit ? rightHit.timeOfImpact : probeDistance;
        const chosenDirection = leftClearDist > rightClearDist ? -1 : 1;

        drone.avoidanceState = {
          active: true,
          direction: chosenDirection,
          ticksRemaining: MIN_AVOIDANCE_TICKS,
        };
      } else {
        drone.avoidanceState.ticksRemaining--;
        if (drone.avoidanceState.ticksRemaining <= 0) {
          drone.avoidanceState.ticksRemaining = MIN_AVOIDANCE_TICKS;
        }
      }
    } else if (drone.avoidanceState && drone.avoidanceState.active) {
      drone.avoidanceState.ticksRemaining--;
      if (drone.avoidanceState.ticksRemaining <= 0) {
        drone.avoidanceState.active = false;
        drone.avoidanceState.transitioning = true;

        let lastAvoidX = 0;
        let lastAvoidZ = 0;
        if (drone.avoidanceState.direction === -1) {
          lastAvoidX = dirX * cos45 - dirZ * sin45;
          lastAvoidZ = dirX * sin45 + dirZ * cos45;
        } else {
          lastAvoidX = dirX * cos45 + dirZ * sin45;
          lastAvoidZ = -dirX * sin45 + dirZ * cos45;
        }
        const avoidLen = Math.sqrt(lastAvoidX * lastAvoidX + lastAvoidZ * lastAvoidZ);
        if (avoidLen > 0.001) {
          lastAvoidX /= avoidLen;
          lastAvoidZ /= avoidLen;
        }
        drone.avoidanceState.transitionX = lastAvoidX;
        drone.avoidanceState.transitionZ = lastAvoidZ;
      }
    }

    const avoidanceActive = drone.avoidanceState && drone.avoidanceState.active;
    let avoidX = 0;
    let avoidZ = 0;

    if (avoidanceActive && drone.avoidanceState) {
      if (drone.avoidanceState.direction === -1) {
        avoidX = dirX * cos45 - dirZ * sin45;
        avoidZ = dirX * sin45 + dirZ * cos45;
      } else {
        avoidX = dirX * cos45 + dirZ * sin45;
        avoidZ = -dirX * sin45 + dirZ * cos45;
      }
      const avoidLen = Math.sqrt(avoidX * avoidX + avoidZ * avoidZ);
      if (avoidLen > 0.001) {
        avoidX /= avoidLen;
        avoidZ /= avoidLen;
      }
    }

    if (avoidanceActive) {
      out.steerX = out.steerX * 0.5 + avoidX * 0.5;
      out.steerZ = out.steerZ * 0.5 + avoidZ * 0.5;
    }

    const maxYawRatePerTick = (conf.maxTurnRate ?? 3.0) * (1 / 60);

    if (drone.avoidanceState && drone.avoidanceState.transitioning) {
      const currentAngle = Math.atan2(drone.avoidanceState.transitionX, drone.avoidanceState.transitionZ);
      const targetAngle = Math.atan2(out.steerX, out.steerZ);
      let angleDiff = targetAngle - currentAngle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      if (Math.abs(angleDiff) <= maxYawRatePerTick) {
        drone.avoidanceState.transitioning = false;
      } else {
        const clampedDiff = Math.max(-maxYawRatePerTick, Math.min(maxYawRatePerTick, angleDiff));
        const nextAngle = currentAngle + clampedDiff;
        drone.avoidanceState.transitionX = Math.sin(nextAngle);
        drone.avoidanceState.transitionZ = Math.cos(nextAngle);
      }
      out.steerX = drone.avoidanceState.transitionX;
      out.steerZ = drone.avoidanceState.transitionZ;
    }

    // 6. Speed limits & Physics integration
    const maxSpeed = conf.speed ?? 10.0;
    const minSpeed = isFixedWing ? conf.minSpeed ?? 10.0 : 0.0;
    const maxAccelPerTick = conf.maxAccelPerTick ?? 0.4;

    out.targetSpeed = Math.max(minSpeed, Math.min(maxSpeed, out.targetSpeed));

    let desiredTx = 0;
    let desiredTy = 0;
    let desiredTz = 0;

    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

    if (isAir) {
      const desiredVx = out.steerX * out.targetSpeed;
      const desiredVy = out.steerY * out.targetSpeed;
      const desiredVz = out.steerZ * out.targetSpeed;

      drone.currentVelocityX += clamp(desiredVx - drone.currentVelocityX, -maxAccelPerTick, maxAccelPerTick);
      drone.currentVelocityY += clamp(desiredVy - drone.currentVelocityY, -maxAccelPerTick, maxAccelPerTick);
      drone.currentVelocityZ += clamp(desiredVz - drone.currentVelocityZ, -maxAccelPerTick, maxAccelPerTick);

      const curVelMag = Math.sqrt(
        drone.currentVelocityX ** 2 + drone.currentVelocityY ** 2 + drone.currentVelocityZ ** 2
      );
      if (curVelMag > maxSpeed && curVelMag > 0.001) {
        const velScale = maxSpeed / curVelMag;
        drone.currentVelocityX *= velScale;
        drone.currentVelocityY *= velScale;
        drone.currentVelocityZ *= velScale;
      }

      desiredTx = drone.currentVelocityX * dt;
      desiredTy = drone.currentVelocityY * dt;
      desiredTz = drone.currentVelocityZ * dt;

      let targetHX = out.forceHeadingX !== 0 ? out.forceHeadingX : drone.currentVelocityX;
      let targetHZ = out.forceHeadingZ !== 0 ? out.forceHeadingZ : drone.currentVelocityZ;

      const hLen = Math.sqrt(drone.currentHeadingX ** 2 + drone.currentHeadingZ ** 2) || 1;
      const cX = drone.currentHeadingX / hLen;
      const cZ = drone.currentHeadingZ / hLen;

      const targetHLen = Math.sqrt(targetHX * targetHX + targetHZ * targetHZ);
      let tX = cX;
      let tZ = cZ;
      if (targetHLen > 0.01) {
        tX = targetHX / targetHLen;
        tZ = targetHZ / targetHLen;
      }

      const targetAngle = Math.atan2(tX, tZ);
      const currentAngle = Math.atan2(cX, cZ);

      let angleDiff = targetAngle - currentAngle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      const clampedDiff = clamp(angleDiff, -maxYawRatePerTick, maxYawRatePerTick);
      const nextAngle = currentAngle + clampedDiff;

      drone.currentHeadingX = Math.sin(nextAngle);
      drone.currentHeadingZ = Math.cos(nextAngle);
    } else {
      const hLen = Math.sqrt(drone.currentHeadingX ** 2 + drone.currentHeadingZ ** 2) || 1;
      const cX = drone.currentHeadingX / hLen;
      const cZ = drone.currentHeadingZ / hLen;

      const targetAngle = Math.atan2(out.steerX, out.steerZ);
      const currentAngle = Math.atan2(cX, cZ);

      let angleDiff = targetAngle - currentAngle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      const clampedDiff = clamp(angleDiff, -maxYawRatePerTick, maxYawRatePerTick);
      const nextAngle = currentAngle + clampedDiff;

      drone.currentHeadingX = Math.sin(nextAngle);
      drone.currentHeadingZ = Math.cos(nextAngle);

      const speedVel = Math.sqrt(drone.currentVelocityX ** 2 + drone.currentVelocityZ ** 2);
      const nextSpeed = speedVel + clamp(out.targetSpeed - speedVel, -maxAccelPerTick, maxAccelPerTick);

      drone.currentVelocityX = drone.currentHeadingX * nextSpeed;
      drone.currentVelocityZ = drone.currentHeadingZ * nextSpeed;

      if (isFixedWing) {
        drone.currentVelocityY = out.steerY * nextSpeed;
      } else {
        drone.currentVelocityY += -18.0 * dt;
        if (drone.currentVelocityY < -40.0) drone.currentVelocityY = -40.0;
      }

      desiredTx = drone.currentVelocityX * dt;
      desiredTy = drone.currentVelocityY * dt;
      desiredTz = drone.currentVelocityZ * dt;
    }

    // 7. Update rotation quat
    drone.rotY = Math.atan2(drone.currentHeadingX, drone.currentHeadingZ);
    drone.rotW = Math.cos(drone.rotY / 2);
    drone.rotY = Math.sin(drone.rotY / 2);
    drone.rotX = 0;
    drone.rotZ = 0;

    if (!drone.kcc && room.initDronePhysics) {
      room.initDronePhysics(drone);
    }

    // 8. Firing handling
    if (out.shouldFire && drone.cooldown <= 0) {
      let targetPos = drone.combatTarget ? drone.combatTarget.lastSensedPosition : null;
      if (targetPos) {
        const muzzle = getDroneMuzzleWorldPosition(drone, targetPos);
        const dx = targetPos.x - muzzle.x;
        const dy = targetPos.y - muzzle.y;
        const dz = targetPos.z - muzzle.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const targetPlayerInstance = drone.combatTarget ? room.players.get(drone.combatTarget.entityId) : null;
        const velX = targetPlayerInstance ? targetPlayerInstance.velEmaX : 0;
        const velY = targetPlayerInstance ? targetPlayerInstance.velEmaY : 0;
        const velZ = targetPlayerInstance ? targetPlayerInstance.velEmaZ : 0;

        const shootSpeed = 35.0;
        const aimX = targetPos.x + velX * (dist / shootSpeed);
        const aimY = targetPos.y + velY * (dist / shootSpeed);
        const aimZ = targetPos.z + velZ * (dist / shootSpeed);

        const fireMuzzle = getDroneMuzzleWorldPosition(drone, { x: aimX, y: aimY, z: aimZ });
        const dirX = aimX - fireMuzzle.x;
        const dirY = aimY - fireMuzzle.y;
        const dirZ = aimZ - fireMuzzle.z;
        const dirLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

        if (dirLen > 0.1) {
          let clear = true;
          if (room.rapierWorld) {
            const ray = new RAPIER.Ray(fireMuzzle, { x: dirX / dirLen, y: dirY / dirLen, z: dirZ / dirLen });
            const hit = room.rapierWorld.castRay(
              ray,
              dirLen,
              true,
              RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC
            );
            if (hit && hit.collider && hit.timeOfImpact < dirLen - 0.7) {
              clear = false;
            }
          }
          if (clear) {
            drone.state = DroneState.ATTACKING;
            room.spawnServerProjectile(
              fireMuzzle.x,
              fireMuzzle.y,
              fireMuzzle.z,
              dirX,
              dirY,
              dirZ,
              true,
              conf.damage ?? 10,
              drone.id.toString()
            );
            room.broadcastReliableEvent({
              type: "drone_shoot",
              droneId: drone.id,
              droneType: drone.type,
              posX: fireMuzzle.x,
              posY: fireMuzzle.y,
              posZ: fireMuzzle.z,
              dirX,
              dirY,
              dirZ,
            });
            drone.cooldown = conf.fireCooldown ?? (drone.type === DroneType.HUMANOID ? 40 : 20);
          }
        }
      }
    }

    // 9. KCC Movement Execution
    if (drone.kcc && drone.collider) {
      drone.kcc.computeColliderMovement(
        drone.collider,
        { x: desiredTx, y: desiredTy, z: desiredTz },
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        undefined
      );

      const correctedTrans = drone.kcc.computedMovement();

      // 10. Stuck detection and recovery
      const desiredMoveLenSq = desiredTx * desiredTx + desiredTz * desiredTz;
      if (desiredMoveLenSq > 0.000001) {
        const correctedMoveLenSq = correctedTrans.x * correctedTrans.x + correctedTrans.z * correctedTrans.z;
        if (correctedMoveLenSq < 0.0001) {
          drone.stuckTicks = (drone.stuckTicks || 0) + 1;
        } else {
          drone.stuckTicks = 0;
        }
      } else {
        drone.stuckTicks = 0;
      }

      const STUCK_TICK_THRESHOLD = 15;
      if ((drone.stuckTicks || 0) >= STUCK_TICK_THRESHOLD) {
        drone.currentVelocityX = 0;
        if (drone.currentVelocityY !== undefined) drone.currentVelocityY = 0;
        drone.currentVelocityZ = 0;

        let recoveryDirection = 1;
        if (room.rapierWorld) {
          const headingLen = Math.sqrt(
            drone.currentHeadingX * drone.currentHeadingX + drone.currentHeadingZ * drone.currentHeadingZ
          );
          const dirX = headingLen > 0.001 ? drone.currentHeadingX / headingLen : 1;
          const dirZ = headingLen > 0.001 ? drone.currentHeadingZ / headingLen : 0;
          const probeDistance = Math.max(3.0, ((conf.detectionRadius ?? BASE_DETECTION_DISTANCE) + 5.0) * 0.75);
          const rayOrigin = getDroneMuzzleWorldPosition(drone);

          const leftDirX = dirX * cos45 - dirZ * sin45;
          const leftDirZ = dirX * sin45 + dirZ * cos45;
          const leftRay = new RAPIER.Ray(rayOrigin, { x: leftDirX, y: 0, z: leftDirZ });
          const leftHit = room.rapierWorld.castRay(
            leftRay,
            probeDistance,
            true,
            RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
            undefined,
            drone.collider || undefined
          );

          const rightDirX = dirX * cos45 + dirZ * sin45;
          const rightDirZ = -dirX * sin45 + dirZ * cos45;
          const rightRay = new RAPIER.Ray(rayOrigin, { x: rightDirX, y: 0, z: rightDirZ });
          const rightHit = room.rapierWorld.castRay(
            rightRay,
            probeDistance,
            true,
            RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
            undefined,
            drone.collider || undefined
          );

          const leftClearDist = leftHit ? leftHit.timeOfImpact : probeDistance;
          const rightClearDist = rightHit ? rightHit.timeOfImpact : probeDistance;
          recoveryDirection = leftClearDist > rightClearDist ? -1 : 1;
        }

        drone.avoidanceState = {
          active: true,
          direction: recoveryDirection,
          ticksRemaining: MIN_AVOIDANCE_TICKS * 2,
        };

        const nudgeDirX = headingLen > 0.001 ? -drone.currentHeadingX / headingLen : -1;
        const nudgeDirZ = headingLen > 0.001 ? -drone.currentHeadingZ / headingLen : 0;
        drone.posX += nudgeDirX * 0.3;
        drone.posZ += nudgeDirZ * 0.3;

        if (drone.body) {
          drone.body.setNextKinematicTranslation({
            x: drone.posX,
            y: drone.posY,
            z: drone.posZ,
          });
        }
        drone.stuckTicks = 0;
      }

      if (
        drone.type === DroneType.HUMANOID ||
        drone.type === DroneType.ROBOT_DOG ||
        drone.type === DroneType.WHEELED
      ) {
        if (drone.kcc.computedGrounded()) {
          drone.currentVelocityY = 0;
        }
      }

      drone.posX += correctedTrans.x;
      drone.posY += correctedTrans.y;
      drone.posZ += correctedTrans.z;

      if (drone.body) {
        drone.body.setNextKinematicTranslation({
          x: drone.posX,
          y: drone.posY,
          z: drone.posZ,
        });
      }
    } else {
      drone.posX += desiredTx;
      drone.posY += desiredTy;
      drone.posZ += desiredTz;
    }

    // 11. Transition to nextState if specified
    if (out.nextState !== null) {
      drone.state = out.nextState;
    }
  }
}
