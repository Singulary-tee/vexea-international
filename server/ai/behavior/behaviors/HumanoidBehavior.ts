import RAPIER from "@dimforge/rapier3d-compat";
import { DroneType, DroneState, DRONE_CONFIGS, INTEL_CONFIGS, WAYPOINTS, ZONES, TOPOLOGY, ZoneName } from "../../../../shared/constants";
import { BehaviorContext, BehaviorOutput } from "../types";
import { computeGroundSteering, applyGroundPhysics, checkGrounded } from "../BaseGroundBehavior";
import { astarPath } from "../../../MatchRoom";

const SERVER_TICK_RATE = 60;
const COVER_CACHE_TICKS = 10;
const INVESTIGATE_HOLD_TICKS = 2.0 * SERVER_TICK_RATE; // 120 ticks (2s)
const SUPPRESS_TOGGLE_INTERVAL = 15; // 0.25s at 60Hz

// Pre-allocated static working objects for Zero-GC pipeline
const tempBestCover = { x: 0, y: 0, z: 0 };
const tempRayOrigin = { x: 0, y: 0, z: 0 };
const tempRayDir = { x: 0, y: 0, z: 0 };
const tempPredictPos = { x: 0, y: 0, z: 0 };
const tempFlankLeft = { x: 0, z: 0 };
const tempFlankRight = { x: 0, z: 0 };

let COVER_RAY_1: RAPIER.Ray | null = null;
let COVER_RAY_2: RAPIER.Ray | null = null;

const CANDIDATE_ANGLES = 4;
const CANDIDATE_DISTANCES = [3, 6, 9, 12];

export function findBestCoverPositionZeroGC(
  drone: any,
  threatX: number,
  threatY: number,
  threatZ: number,
  room: any,
  intel: any
): { x: number; y: number; z: number } | null {
  if (!COVER_RAY_1) COVER_RAY_1 = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
  if (!COVER_RAY_2) COVER_RAY_2 = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });

  let found = false;
  let maxScore = -Infinity;

  const optimalRange = (intel.engagementMin + intel.engagementMax) / 2;
  const threatZone = (room.zoneRegistry ? room.zoneRegistry.getZoneAtPosition(threatX, threatZ) : null) as ZoneName | null;

  for (let a = 0; a < CANDIDATE_ANGLES; a++) {
    const angle = (a * Math.PI * 2) / CANDIDATE_ANGLES;
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);

    for (let d = 0; d < CANDIDATE_DISTANCES.length; d++) {
      const dist = CANDIDATE_DISTANCES[d];
      const candX = drone.posX + cosA * dist;
      const candY = drone.posY;
      const candZ = drone.posZ + sinA * dist;

      // 1. Reachable check using Rapier raycast
      let isReachable = true;
      if (room.rapierWorld) {
        const dx = candX - drone.posX;
        const dz = candZ - drone.posZ;
        const rayDist = Math.sqrt(dx * dx + dz * dz);
        if (rayDist > 0.01) {
          tempRayOrigin.x = drone.posX;
          tempRayOrigin.y = drone.posY + 0.5;
          tempRayOrigin.z = drone.posZ;
          tempRayDir.x = dx / rayDist;
          tempRayDir.y = 0;
          tempRayDir.z = dz / rayDist;
          COVER_RAY_1.origin.x = tempRayOrigin.x;
          COVER_RAY_1.origin.y = tempRayOrigin.y;
          COVER_RAY_1.origin.z = tempRayOrigin.z;
          COVER_RAY_1.dir.x = tempRayDir.x;
          COVER_RAY_1.dir.y = tempRayDir.y;
          COVER_RAY_1.dir.z = tempRayDir.z;
          const hit = room.rapierWorld.castRay(
            COVER_RAY_1,
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

      // 2. Provides cover check using collisionMap with zone portal pre-culling (ARCH-04)
      const tToCandX = candX - threatX;
      const tToCandY = candY + 0.5 - threatY;
      const tToCandZ = candZ - threatZ;
      const tToCandDist = Math.sqrt(tToCandX * tToCandX + tToCandY * tToCandY + tToCandZ * tToCandZ);
      let providesCover = false;
      if (tToCandDist > 0.01) {
        let isZoneOccluded = false;
        if (threatZone && room.zoneRegistry) {
          const candZone = room.zoneRegistry.getZoneAtPosition(candX, candZ) as ZoneName | null;
          if (candZone && candZone !== threatZone && !TOPOLOGY[candZone]?.includes(threatZone)) {
            isZoneOccluded = true;
          }
        }

        if (isZoneOccluded) {
          providesCover = true;
        } else if (room.collisionMap) {
          tempRayOrigin.x = threatX;
          tempRayOrigin.y = threatY;
          tempRayOrigin.z = threatZ;
          tempRayDir.x = tToCandX / tToCandDist;
          tempRayDir.y = tToCandY / tToCandDist;
          tempRayDir.z = tToCandZ / tToCandDist;
          providesCover = room.collisionMap.rayIntersectsAny(tempRayOrigin, tempRayDir, tToCandDist);
        }
      }

      // 3. Scoring
      const coverScore = providesCover ? 100 : 0;
      const distToThreat = tToCandDist;
      const rangeScore = 100 - Math.abs(distToThreat - optimalRange) * 5;
      const proximityScore = 50 - dist;
      const totalScore = coverScore * 2.0 + rangeScore + proximityScore;

      if (totalScore > maxScore) {
        maxScore = totalScore;
        tempBestCover.x = candX;
        tempBestCover.y = candY;
        tempBestCover.z = candZ;
        found = true;
      }
    }
  }

  return found ? tempBestCover : null;
}

export function humanoidBehavior(drone: any, ctx: BehaviorContext, out: BehaviorOutput) {
  const intel = INTEL_CONFIGS[DroneType.HUMANOID];
  const conf = DRONE_CONFIGS[DroneType.HUMANOID];

  // Posture from group tactical state or default ASSAULT
  const groupPosture = ctx.getGroupPosture(drone.groupId) || "ASSAULT";
  drone.posture = groupPosture;

  if (!drone.humanoidPhase) drone.humanoidPhase = "HUNT";
  if (!drone.coverCacheTick) drone.coverCacheTick = 0;
  if (!drone.targetLastMoveTick) drone.targetLastMoveTick = 0;
  if (!drone.investigateHoldTick) drone.investigateHoldTick = 0;
  if (!drone.humanoidPose) drone.humanoidPose = "stand_run";
  if (!drone.peekCooldown) drone.peekCooldown = 0;

  const targetEntity = drone.mode === "COMBAT" && drone.combatTarget ? drone.combatTarget : null;

  // Park & Resume Order state tracking
  if (targetEntity) {
    if (!drone.parkedOrder.active && drone.path && drone.path.length > 0) {
      drone.parkedOrder.type = "move";
      drone.parkedOrder.targetZone = drone.path[drone.path.length - 1];
      drone.parkedOrder.path.length = 0;
      for (let i = 0; i < drone.path.length; i++) drone.parkedOrder.path[i] = drone.path[i];
      drone.parkedOrder.pathIndex = drone.pathIndex;
      drone.parkedOrder.active = true;
    }
  } else if (drone.parkedOrder.active) {
    // Target lost: resume parked movement order
    drone.path.length = 0;
    for (let i = 0; i < drone.parkedOrder.path.length; i++) drone.path[i] = drone.parkedOrder.path[i];
    drone.pathIndex = drone.parkedOrder.pathIndex;
    drone.state = DroneState.PATROLLING;
    drone.parkedOrder.active = false;
  }

  // Predictive target position calculation using target velocity EMA
  let targetX = 0;
  let targetY = 0;
  let targetZ = 0;
  let hasTarget = false;

  if (targetEntity && targetEntity.lastSensedPosition) {
    hasTarget = true;
    targetX = targetEntity.lastSensedPosition.x;
    targetY = targetEntity.lastSensedPosition.y;
    targetZ = targetEntity.lastSensedPosition.z;

    const velEma = ctx.getPlayerVelEma(targetEntity.entityId);
    if (velEma) {
      const dx = targetX - drone.posX;
      const dy = targetY - drone.posY;
      const dz = targetZ - drone.posZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const leadTime = dist / 35.0; // shootSpeed = 35
      tempPredictPos.x = targetX + velEma.x * leadTime;
      tempPredictPos.y = targetY + velEma.y * leadTime;
      tempPredictPos.z = targetZ + velEma.z * leadTime;
    } else {
      tempPredictPos.x = targetX;
      tempPredictPos.y = targetY;
      tempPredictPos.z = targetZ;
    }
  }

  // Damage reaction check
  const recentlyHit = ctx.room.serverTick - (drone.lastDamageTick || -9999) < 30;

  // Cover caching logic
  const getCover = (): { x: number; y: number; z: number } | null => {
    if (!hasTarget) return null;
    const ticksSinceCache = ctx.room.serverTick - drone.coverCacheTick;

    let coverCompromised = false;
    if (drone.cachedCoverPos && ctx.room.collisionMap) {
      const hX = drone.posX - targetX;
      const hY = drone.posY + 0.5 - targetY;
      const hZ = drone.posZ - targetZ;
      const hDist = Math.sqrt(hX * hX + hY * hY + hZ * hZ);
      if (hDist > 0.01) {
        tempRayOrigin.x = targetX;
        tempRayOrigin.y = targetY;
        tempRayOrigin.z = targetZ;
        tempRayDir.x = hX / hDist;
        tempRayDir.y = hY / hDist;
        tempRayDir.z = hZ / hDist;
        coverCompromised = !ctx.room.collisionMap.rayIntersectsAny(tempRayOrigin, tempRayDir, hDist);
      }
    }

    if (!drone.cachedCoverPos || ticksSinceCache > COVER_CACHE_TICKS || coverCompromised) {
      const best = findBestCoverPositionZeroGC(drone, targetX, targetY, targetZ, ctx.room, intel);
      if (best) {
        drone.cachedCoverPos.x = best.x;
        drone.cachedCoverPos.y = best.y;
        drone.cachedCoverPos.z = best.z;
      }
      drone.coverCacheTick = ctx.room.serverTick;
    }
    return drone.cachedCoverPos;
  };

  // 2.4 Damage Reaction: If recently hit and has target, override posture to TAKE_COVER
  if (recentlyHit && hasTarget) {
    const cover = getCover();
    if (cover) {
      drone.humanoidPhase = "TAKE_COVER";
      computeGroundSteering(drone, cover.x, cover.z, out, { speed: conf.speed * 1.5 });
      drone.humanoidPose = "crouch_sprint";
      return;
    }
  }

  // State Machine Branching based on Posture
  if (groupPosture === "HOLD") {
    // Strict Defensive Hold
    out.nextState = DroneState.ATTACKING;
    out.steerX = 0;
    out.steerZ = 0;
    out.targetSpeed = 0;
    drone.humanoidPose = "crouch_hold";

    if (hasTarget) {
      const hdx = targetX - drone.posX;
      const hdz = targetZ - drone.posZ;
      const hDist = Math.sqrt(hdx * hdx + hdz * hdz) || 1;
      if (hDist >= intel.engagementMin && hDist <= intel.engagementMax) {
        out.forceHeadingX = hdx / hDist;
        out.forceHeadingZ = hdz / hDist;
        out.shouldFire = true;
        drone.humanoidPose = "stand_fire";
      } else {
        drone.humanoidPose = "crouch_hold";
      }
    }
  } else if (groupPosture === "RETREAT") {
    // Tactical Fallback
    out.nextState = DroneState.REPOSITIONING;
    drone.humanoidPose = "crouch_sprint";
    const spawnZone = ZONES.SPAWN;
    const path = astarPath(drone.zone, spawnZone);
    if (path && path.length > 0) {
      let targetZone = path[0];
      if (path.length > 1 && path[0] === drone.zone) {
        targetZone = path[1];
      }
      const wp = WAYPOINTS[targetZone as keyof typeof WAYPOINTS] || WAYPOINTS[ZONES.SPAWN];
      computeGroundSteering(drone, wp.x, wp.z, out, { speed: conf.speed });
    } else if (hasTarget) {
      const awayX = drone.posX - targetX;
      const awayZ = drone.posZ - targetZ;
      const awayDist = Math.sqrt(awayX * awayX + awayZ * awayZ) || 1;
      const retreatTargetX = drone.posX + (awayX / awayDist) * 15;
      const retreatTargetZ = drone.posZ + (awayZ / awayDist) * 15;
      computeGroundSteering(drone, retreatTargetX, retreatTargetZ, out, { speed: conf.speed });
    } else {
      drone.humanoidPhase = "HUNT";
    }
  } else if (groupPosture === "SUPPRESS") {
    // Suppress Posture
    out.nextState = DroneState.ATTACKING;
    if (hasTarget) {
      const sdx = targetX - drone.posX;
      const sdz = targetZ - drone.posZ;
      const sDist = Math.sqrt(sdx * sdx + sdz * sdz) || 1;

      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
      out.forceHeadingX = sdx / sDist;
      out.forceHeadingZ = sdz / sDist;
      out.shouldFire = true;
      drone.humanoidPose = "stand_fire";
    } else {
      drone.humanoidPhase = "HUNT";
    }
  } else if (groupPosture === "FLANK") {
    // Flank Posture
    const suppressors = ctx.countSquadMatesInPosture(drone, "SUPPRESS");
    if (suppressors < 1) {
      // No suppression active — cannot safely flank. Switch to HOLD behavior.
      out.nextState = DroneState.ATTACKING;
      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
      drone.humanoidPose = "crouch_hold";
      if (hasTarget) {
        const dx = targetX - drone.posX;
        const dz = targetZ - drone.posZ;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        out.forceHeadingX = dx / dist;
        out.forceHeadingZ = dz / dist;
        out.shouldFire = true;
      }
      return;
    }

    out.nextState = DroneState.PURSUING;
    drone.humanoidPose = recentlyHit ? "crouch_sprint" : "stand_run";

    if (hasTarget) {
      const optimalRange = (intel.engagementMin + intel.engagementMax) / 2;
      const tToHX = drone.posX - targetX;
      const tToHZ = drone.posZ - targetZ;
      const tToHDist = Math.sqrt(tToHX * tToHX + tToHZ * tToHZ) || 1;

      tempFlankLeft.x = targetX + (-tToHZ / tToHDist) * optimalRange;
      tempFlankLeft.z = targetZ + (tToHX / tToHDist) * optimalRange;
      tempFlankRight.x = targetX + (tToHZ / tToHDist) * optimalRange;
      tempFlankRight.z = targetZ + (-tToHX / tToHDist) * optimalRange;

      let leftCover = false;
      if (ctx.room.collisionMap) {
        tempRayOrigin.x = targetX;
        tempRayOrigin.y = targetY;
        tempRayOrigin.z = targetZ;
        tempRayDir.x = -tToHZ / tToHDist;
        tempRayDir.y = 0;
        tempRayDir.z = tToHX / tToHDist;
        leftCover = ctx.room.collisionMap.rayIntersectsAny(tempRayOrigin, tempRayDir, optimalRange);
      }

      const flankTarget = leftCover ? tempFlankLeft : tempFlankRight;
      computeGroundSteering(drone, flankTarget.x, flankTarget.z, out, { speed: conf.speed });

      const fdx = flankTarget.x - drone.posX;
      const fdz = flankTarget.z - drone.posZ;
      if (Math.sqrt(fdx * fdx + fdz * fdz) <= 3.0) {
        out.shouldFire = true;
        drone.humanoidPose = "stand_fire";
      }
    } else {
      drone.humanoidPhase = "HUNT";
    }
  } else {
    // Standard Posture (ASSAULT or DEFAULT)
    switch (drone.humanoidPhase) {
      case "HUNT": {
        out.nextState = DroneState.PURSUING;
        drone.humanoidPose = recentlyHit ? "crouch_sprint" : "stand_run";

        if (hasTarget) {
          const cover = getCover();
          if (cover && recentlyHit) {
            drone.humanoidPhase = "TAKE_COVER";
            computeGroundSteering(drone, cover.x, cover.z, out, { speed: conf.speed });
          } else {
            computeGroundSteering(drone, targetX, targetZ, out, { speed: conf.speed });
            out.shouldFire = true;
            drone.humanoidPose = "stand_fire";
          }
        } else {
          // Check memory records
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
            out.nextState = DroneState.PATROLLING;
            const wp = WAYPOINTS[drone.zone as keyof typeof WAYPOINTS] || WAYPOINTS.zone_spawn;
            computeGroundSteering(drone, wp.x, wp.z, out, { speed: conf.speed * 0.5 });
            drone.humanoidPose = "stand_run";
          }
        }
        break;
      }

      case "TAKE_COVER": {
        out.nextState = DroneState.REPOSITIONING;
        drone.humanoidPose = "crouch_sprint";
        const cover = getCover();
        if (!cover) {
          drone.humanoidPhase = "HUNT";
          break;
        }

        computeGroundSteering(drone, cover.x, cover.z, out, { speed: conf.speed });
        const cdx = cover.x - drone.posX;
        const cdz = cover.z - drone.posZ;
        if (Math.sqrt(cdx * cdx + cdz * cdz) <= 2.0) {
          drone.humanoidPhase = "IN_COVER";
          drone.peekCooldown = 15 + Math.floor(Math.random() * 30);
        }
        break;
      }

      case "IN_COVER": {
        out.nextState = DroneState.ATTACKING;
        out.steerX = 0;
        out.steerZ = 0;
        out.targetSpeed = 0;
        drone.humanoidPose = "crouch_hold";

        if (hasTarget) {
          if (drone.peekCooldown > 0) {
            drone.peekCooldown--;
          } else {
            out.shouldFire = true;
            drone.humanoidPose = "stand_fire";
            const tdx = tempPredictPos.x - drone.posX;
            const tdz = tempPredictPos.z - drone.posZ;
            const tDist = Math.sqrt(tdx * tdx + tdz * tdz) || 1;
            out.forceHeadingX = tdx / tDist;
            out.forceHeadingZ = tdz / tDist;
            drone.peekCooldown = 15 + Math.floor(Math.random() * 30);
          }
        } else {
          drone.humanoidPhase = "HUNT";
        }
        break;
      }

      case "INVESTIGATE": {
        out.nextState = DroneState.PURSUING;
        if (hasTarget) {
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

        // Bug fix: use lastSensedPosition from MemoryRecord
        const memX = bestMemory.lastSensedPosition ? bestMemory.lastSensedPosition.x : drone.posX;
        const memZ = bestMemory.lastSensedPosition ? bestMemory.lastSensedPosition.z : drone.posZ;
        const mdx = memX - drone.posX;
        const mdz = memZ - drone.posZ;
        const mDist = Math.sqrt(mdx * mdx + mdz * mdz);

        if (mDist > 2.0) {
          computeGroundSteering(drone, memX, memZ, out, { speed: conf.speed });
          drone.humanoidPose = "crouch_sprint";
          drone.investigateHoldTick = 0;
        } else {
          out.steerX = 0;
          out.steerZ = 0;
          out.targetSpeed = 0;
          drone.investigateHoldTick = (drone.investigateHoldTick || 0) + 1;

          const scanAngle = (drone.investigateHoldTick / INVESTIGATE_HOLD_TICKS) * Math.PI * 2;
          out.forceHeadingX = Math.sin(scanAngle);
          out.forceHeadingZ = Math.cos(scanAngle);
          drone.humanoidPose = "crouch_hold";

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
  }

  // Apply ground physics
  applyGroundPhysics(drone, out, ctx.dt, { speed: conf.speed, maxAccelPerTick: conf.maxAccelPerTick });
  checkGrounded(drone, drone.kcc);
}
