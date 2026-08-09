import RAPIER from "@dimforge/rapier3d-compat";
import { DroneType, DroneState, DRONE_CONFIGS, INTEL_CONFIGS, WAYPOINTS } from "../../../../shared/constants";
import { BehaviorContext, BehaviorOutput } from "../types";
import { computeGroundSteering, applyGroundPhysics, checkGrounded } from "../BaseGroundBehavior";

const SERVER_TICK_RATE = 60;
const COVER_CACHE_TICKS = 10;
const PINNED_TICKS_THRESHOLD = 3.0 * SERVER_TICK_RATE; // 180 ticks (3s)
const INVESTIGATE_HOLD_TICKS = 2.0 * SERVER_TICK_RATE; // 120 ticks (2s)
const FLANK_TIMEOUT_TICKS = 5.0 * SERVER_TICK_RATE; // 300 ticks (5s)
const SUPPRESS_FLANK_TICKS = 5.0 * SERVER_TICK_RATE; // 300 ticks (5s)
const PEEK_FIRE_INTERVAL = 30; // 0.5s at 60Hz
const SUPPRESS_TOGGLE_INTERVAL = 15; // 0.25s at 60Hz

export function findBestCoverPosition(
  drone: any,
  threatPos: { x: number; y: number; z: number },
  room: any,
  intel: any
): { x: number; y: number; z: number } | null {
  const CANDIDATE_ANGLES = 4;
  const CANDIDATE_DISTANCES = [3, 6, 9, 12];
  let bestPos: { x: number; y: number; z: number } | null = null;
  let maxScore = -Infinity;

  const optimalRange = (intel.engagementMin + intel.engagementMax) / 2;

  for (let a = 0; a < CANDIDATE_ANGLES; a++) {
    const angle = (a * Math.PI * 2) / CANDIDATE_ANGLES;
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);

    for (let d = 0; d < CANDIDATE_DISTANCES.length; d++) {
      const dist = CANDIDATE_DISTANCES[d];
      const candX = drone.posX + cosA * dist;
      const candY = drone.posY;
      const candZ = drone.posZ + sinA * dist;

      // 1. isReachable: Cast short ray from humanoid pos to candidate using rapierWorld
      let isReachable = true;
      if (room.rapierWorld) {
        const dx = candX - drone.posX;
        const dz = candZ - drone.posZ;
        const rayDist = Math.sqrt(dx * dx + dz * dz);
        if (rayDist > 0.01) {
          const ray = new RAPIER.Ray(
            { x: drone.posX, y: drone.posY + 0.5, z: drone.posZ },
            { x: dx / rayDist, y: 0, z: dz / rayDist }
          );
          const hit = room.rapierWorld.castRay(
            ray,
            rayDist,
            true,
            RAPIER.QueryFilterFlags.EXCLUDE_SENSORS | RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
            undefined,
            drone.collider || undefined
          );
          if (hit && hit.timeOfImpact < rayDist - 0.2) {
            isReachable = false;
          }
        }
      }

      if (!isReachable) continue;

      // 2. providesCover: Cast ray from threatPos to candidate using collisionMap.rayIntersectsAny
      const candPos = { x: candX, y: candY + 0.5, z: candZ };
      const tToCandX = candX - threatPos.x;
      const tToCandY = candY + 0.5 - threatPos.y;
      const tToCandZ = candZ - threatPos.z;
      const tToCandDist = Math.sqrt(tToCandX * tToCandX + tToCandY * tToCandY + tToCandZ * tToCandZ);
      let providesCover = false;
      if (tToCandDist > 0.01 && room.collisionMap) {
        const dir = { x: tToCandX / tToCandDist, y: tToCandY / tToCandDist, z: tToCandZ / tToCandDist };
        providesCover = room.collisionMap.rayIntersectsAny(threatPos, dir, tToCandDist);
      }

      // 3. hasAttackLOS: Cast ray from candidate to threatPos using collisionMap.rayIntersectsAny
      const candToTX = threatPos.x - candX;
      const candToTY = threatPos.y - (candY + 0.5);
      const candToTZ = threatPos.z - candZ;
      const candToTDist = Math.sqrt(candToTX * candToTX + candToTY * candToTY + candToTZ * candToTZ);
      let hasAttackLOS = true;
      if (candToTDist > 0.01 && room.collisionMap) {
        const dir = { x: candToTX / candToTDist, y: candToTY / candToTDist, z: candToTZ / candToTDist };
        hasAttackLOS = !room.collisionMap.rayIntersectsAny(candPos, dir, candToTDist);
      }

      // 4. Scoring
      const coverScore = providesCover ? 100 : 0;
      const distToThreat = candToTDist;
      const rangeScore = 100 - Math.abs(distToThreat - optimalRange) * 5;
      const proximityScore = 50 - dist;
      const totalScore = coverScore * 2.0 + rangeScore + proximityScore;

      if (totalScore > maxScore) {
        maxScore = totalScore;
        bestPos = { x: candX, y: candY, z: candZ };
      }
    }
  }

  return bestPos;
}

export function isTargetPinned(
  drone: any,
  target: { x: number; y: number; z: number },
  room: any,
  intel: any
): boolean {
  if (!drone.targetLastPos) {
    drone.targetLastPos = { x: target.x, y: target.y, z: target.z };
    drone.targetLastMoveTick = room.serverTick;
    return false;
  }

  const dx = target.x - drone.targetLastPos.x;
  const dy = target.y - drone.targetLastPos.y;
  const dz = target.z - drone.targetLastPos.z;
  const distMoved = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (distMoved > 1.0) {
    drone.targetLastPos.x = target.x;
    drone.targetLastPos.y = target.y;
    drone.targetLastPos.z = target.z;
    drone.targetLastMoveTick = room.serverTick;
  }

  const ticksImmobile = room.serverTick - drone.targetLastMoveTick;
  const isImmobile = ticksImmobile > PINNED_TICKS_THRESHOLD;

  // Raycast from drone to target blocked by collisionMap
  const dToTX = target.x - drone.posX;
  const dToTY = target.y - (drone.posY + 0.5);
  const dToTZ = target.z - drone.posZ;
  const dToTDist = Math.sqrt(dToTX * dToTX + dToTY * dToTY + dToTZ * dToTZ);

  let isBehindCover = false;
  if (dToTDist > 0.01 && room.collisionMap) {
    const dir = { x: dToTX / dToTDist, y: dToTY / dToTDist, z: dToTZ / dToTDist };
    const droneSensor = { x: drone.posX, y: drone.posY + 0.5, z: drone.posZ };
    isBehindCover = room.collisionMap.rayIntersectsAny(droneSensor, dir, dToTDist);
  }

  const inRange = dToTDist <= intel.engagementMax;

  return isImmobile && isBehindCover && inRange;
}

export function humanoidBehavior(drone: any, ctx: BehaviorContext, out: BehaviorOutput) {
  const intel = INTEL_CONFIGS[DroneType.HUMANOID];
  const conf = DRONE_CONFIGS[DroneType.HUMANOID];

  if (!drone.humanoidPhase) drone.humanoidPhase = "HUNT";
  if (drone.cachedCoverPos === undefined) drone.cachedCoverPos = null;
  if (!drone.coverCacheTick) drone.coverCacheTick = 0;
  if (!drone.targetLastPos) drone.targetLastPos = { x: 0, y: 0, z: 0 };
  if (!drone.targetLastMoveTick) drone.targetLastMoveTick = 0;
  if (drone.suppressToggle === undefined) drone.suppressToggle = false;
  if (!drone.investigateHoldTick) drone.investigateHoldTick = 0;

  const target =
    drone.mode === "COMBAT" && drone.combatTarget
      ? drone.combatTarget.lastSensedPosition
      : null;

  // Update pinning tracker
  if (target) {
    const dx = target.x - drone.targetLastPos.x;
    const dy = target.y - drone.targetLastPos.y;
    const dz = target.z - drone.targetLastPos.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) > 1.0) {
      drone.targetLastPos.x = target.x;
      drone.targetLastPos.y = target.y;
      drone.targetLastPos.z = target.z;
      drone.targetLastMoveTick = ctx.room.serverTick;
    }
  }

  const pinned = target ? isTargetPinned(drone, target, ctx.room, intel) : false;

  const getCover = (): { x: number; y: number; z: number } | null => {
    if (!target) return null;
    const ticksSinceCache = ctx.room.serverTick - drone.coverCacheTick;

    // Check if cover compromised: raycast from threat to current position is clear
    let coverCompromised = false;
    if (drone.cachedCoverPos && ctx.room.collisionMap) {
      const hX = drone.posX - target.x;
      const hY = drone.posY + 0.5 - target.y;
      const hZ = drone.posZ - target.z;
      const hDist = Math.sqrt(hX * hX + hY * hY + hZ * hZ);
      if (hDist > 0.01) {
        const dir = { x: hX / hDist, y: hY / hDist, z: hZ / hDist };
        coverCompromised = !ctx.room.collisionMap.rayIntersectsAny(target, dir, hDist);
      }
    }

    if (!drone.cachedCoverPos || ticksSinceCache > COVER_CACHE_TICKS || coverCompromised) {
      const best = findBestCoverPosition(drone, target, ctx.room, intel);
      if (best) {
        if (!drone.cachedCoverPos) drone.cachedCoverPos = { x: 0, y: 0, z: 0 };
        drone.cachedCoverPos.x = best.x;
        drone.cachedCoverPos.y = best.y;
        drone.cachedCoverPos.z = best.z;
      } else {
        drone.cachedCoverPos = null;
      }
      drone.coverCacheTick = ctx.room.serverTick;
    }
    return drone.cachedCoverPos;
  };

  switch (drone.humanoidPhase) {
    case "HUNT": {
      out.nextState = DroneState.PURSUING;
      if (target) {
        const dx = target.x - drone.posX;
        const dz = target.z - drone.posZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        let hasLOS = false;
        if (dist > 0.01 && ctx.room.collisionMap) {
          const dir = { x: dx / dist, y: (target.y - drone.posY) / dist, z: dz / dist };
          hasLOS = !ctx.room.collisionMap.rayIntersectsAny(
            { x: drone.posX, y: drone.posY + 0.5, z: drone.posZ },
            dir,
            dist
          );
        }

        if (hasLOS && dist <= intel.engagementMax) {
          const cover = getCover();
          if (cover) {
            drone.humanoidPhase = "TAKE_COVER";
            computeGroundSteering(drone, cover.x, cover.z, out, { speed: conf.speed });
          } else {
            // No cover found: approach directly, fire
            computeGroundSteering(drone, target.x, target.z, out, { speed: conf.speed });
            out.shouldFire = true;
          }
        } else {
          // Steer toward lastSensedPosition
          computeGroundSteering(drone, target.x, target.z, out, { speed: conf.speed });
        }
      } else {
        // Search memory
        let bestMemory: any = null;
        if (drone.memoryRecords && drone.memoryRecords.size > 0) {
          let highestConf = 0.1;
          for (const mem of drone.memoryRecords.values()) {
            if (mem.confidence > highestConf) {
              highestConf = mem.confidence;
              bestMemory = mem;
            }
          }
        }
        if (bestMemory) {
          drone.humanoidPhase = "INVESTIGATE";
          drone.investigateHoldTick = 0;
        } else {
          // Resume patrol
          out.nextState = DroneState.PATROLLING;
          const wp = WAYPOINTS[drone.zone as keyof typeof WAYPOINTS] || WAYPOINTS.zone_spawn;
          computeGroundSteering(drone, wp.x, wp.z, out, { speed: conf.speed * 0.5 });
        }
      }
      break;
    }

    case "TAKE_COVER": {
      out.nextState = DroneState.REPOSITIONING;
      const cover = getCover();
      if (!cover) {
        drone.humanoidPhase = "HUNT";
        break;
      }

      computeGroundSteering(drone, cover.x, cover.z, out, { speed: conf.speed });
      const cdx = cover.x - drone.posX;
      const cdz = cover.z - drone.posZ;
      const cDist = Math.sqrt(cdx * cdx + cdz * cdz);

      if (cDist <= 2.0) {
        drone.humanoidPhase = "IN_COVER";
      } else if (pinned) {
        drone.humanoidPhase = "FLANK";
        drone.flankStartTick = ctx.room.serverTick;
      }
      break;
    }

    case "IN_COVER": {
      out.nextState = DroneState.ATTACKING;
      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;

      if (target) {
        // Peek to fire every 30 ticks
        if (ctx.room.serverTick % PEEK_FIRE_INTERVAL === 0) {
          out.shouldFire = true;
          const tdx = target.x - drone.posX;
          const tdz = target.z - drone.posZ;
          const tDist = Math.sqrt(tdx * tdx + tdz * tdz) || 1;
          out.forceHeadingX = tdx / tDist;
          out.forceHeadingZ = tdz / tDist;
        }

        if (pinned) {
          drone.humanoidPhase = "FLANK";
          drone.flankStartTick = ctx.room.serverTick;
        } else {
          // Check if cover compromised: raycast from threat to humanoid is clear
          const hX = drone.posX - target.x;
          const hY = drone.posY + 0.5 - target.y;
          const hZ = drone.posZ - target.z;
          const hDist = Math.sqrt(hX * hX + hY * hY + hZ * hZ);
          if (hDist > 0.01 && ctx.room.collisionMap) {
            const dir = { x: hX / hDist, y: hY / hDist, z: hZ / hDist };
            const isClear = !ctx.room.collisionMap.rayIntersectsAny(target, dir, hDist);
            if (isClear) {
              drone.humanoidPhase = "HUNT";
            }
          }
        }
      } else {
        drone.humanoidPhase = "HUNT";
      }
      break;
    }

    case "FLANK": {
      out.nextState = DroneState.PURSUING;
      if (!target) {
        drone.humanoidPhase = "HUNT";
        break;
      }

      if (!drone.flankStartTick) drone.flankStartTick = ctx.room.serverTick;
      if (ctx.room.serverTick - drone.flankStartTick > FLANK_TIMEOUT_TICKS) {
        drone.humanoidPhase = "HUNT";
        break;
      }

      const optimalRange = (intel.engagementMin + intel.engagementMax) / 2;

      // Compute vector from threat to humanoid
      const tToHX = drone.posX - target.x;
      const tToHZ = drone.posZ - target.z;
      const tToHDist = Math.sqrt(tToHX * tToHX + tToHZ * tToHZ) || 1;

      // Perpendicular vectors (left & right)
      const leftX = -tToHZ / tToHDist;
      const leftZ = tToHX / tToHDist;
      const rightX = tToHZ / tToHDist;
      const rightZ = -tToHX / tToHDist;

      const leftFlankPos = { x: target.x + leftX * optimalRange, z: target.z + leftZ * optimalRange };
      const rightFlankPos = { x: target.x + rightX * optimalRange, z: target.z + rightZ * optimalRange };

      // Check which side has more building cover from threat
      let leftHasCover = false;
      let rightHasCover = false;

      if (ctx.room.collisionMap) {
        leftHasCover = ctx.room.collisionMap.rayIntersectsAny(
          target,
          { x: leftX, y: 0, z: leftZ },
          optimalRange
        );
        rightHasCover = ctx.room.collisionMap.rayIntersectsAny(
          target,
          { x: rightX, y: 0, z: rightZ },
          optimalRange
        );
      }

      const flankTarget = leftHasCover || !rightHasCover ? leftFlankPos : rightFlankPos;

      computeGroundSteering(drone, flankTarget.x, flankTarget.z, out, { speed: conf.speed });

      const fdx = flankTarget.x - drone.posX;
      const fdz = flankTarget.z - drone.posZ;
      if (Math.sqrt(fdx * fdx + fdz * fdz) <= 3.0) {
        drone.humanoidPhase = "TAKE_COVER";
      }
      break;
    }

    case "SUPPRESS": {
      out.nextState = DroneState.ATTACKING;
      if (!target) {
        drone.humanoidPhase = "HUNT";
        break;
      }

      if (!pinned) {
        drone.humanoidPhase = "HUNT";
        break;
      }

      if (!drone.targetLastMoveTick) drone.targetLastMoveTick = ctx.room.serverTick;
      if (ctx.room.serverTick - drone.targetLastMoveTick > SUPPRESS_FLANK_TICKS) {
        drone.humanoidPhase = "FLANK";
        drone.flankStartTick = ctx.room.serverTick;
        break;
      }

      if (ctx.room.serverTick % SUPPRESS_TOGGLE_INTERVAL === 0) {
        drone.suppressToggle = !drone.suppressToggle;
      }

      const offsetX = drone.suppressToggle ? 1.0 : -1.0;
      const suppressTargetX = target.x + offsetX;
      const suppressTargetZ = target.z;

      const sdx = suppressTargetX - drone.posX;
      const sdz = suppressTargetZ - drone.posZ;
      const sDist = Math.sqrt(sdx * sdx + sdz * sdz) || 1;

      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
      out.forceHeadingX = sdx / sDist;
      out.forceHeadingZ = sdz / sDist;
      out.shouldFire = true;
      break;
    }

    case "INVESTIGATE": {
      out.nextState = DroneState.PURSUING;
      if (target) {
        drone.humanoidPhase = "HUNT";
        break;
      }

      let bestMemory: any = null;
      if (drone.memoryRecords && drone.memoryRecords.size > 0) {
        let highestConf = 0.1;
        for (const mem of drone.memoryRecords.values()) {
          if (mem.confidence > highestConf) {
            highestConf = mem.confidence;
            bestMemory = mem;
          }
        }
      }

      if (!bestMemory) {
        drone.humanoidPhase = "HUNT";
        break;
      }

      const mdx = bestMemory.posX - drone.posX;
      const mdz = bestMemory.posZ - drone.posZ;
      const mDist = Math.sqrt(mdx * mdx + mdz * mdz);

      if (mDist > 2.0) {
        computeGroundSteering(drone, bestMemory.posX, bestMemory.posZ, out, { speed: conf.speed });
        drone.investigateHoldTick = 0;
      } else {
        out.steerX = 0;
        out.steerZ = 0;
        out.targetSpeed = 0;
        drone.investigateHoldTick = (drone.investigateHoldTick || 0) + 1;

        const scanAngle = (drone.investigateHoldTick / INVESTIGATE_HOLD_TICKS) * Math.PI * 2;
        out.forceHeadingX = Math.sin(scanAngle);
        out.forceHeadingZ = Math.cos(scanAngle);

        if (drone.investigateHoldTick >= INVESTIGATE_HOLD_TICKS) {
          drone.humanoidPhase = "HUNT";
        }
      }
      break;
    }

    default: {
      drone.humanoidPhase = "HUNT";
      break;
    }
  }

  // Apply ground physics
  applyGroundPhysics(drone, out, ctx.dt, { speed: conf.speed, maxAccelPerTick: conf.maxAccelPerTick });
  checkGrounded(drone, drone.kcc);
}
