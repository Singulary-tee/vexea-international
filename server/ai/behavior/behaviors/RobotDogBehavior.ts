import { DroneType, DRONE_CONFIGS, INTEL_CONFIGS, WAYPOINTS, ZONES } from "../../../../shared/constants";
import { BehaviorContext, BehaviorOutput } from "../types";
import { UNKNOWN_THRESHOLD } from "../../DroneMemory";

// Action ID constants (module scope)
export const RD_PATROL = 0;
export const RD_PURSUE_FIRE = 1;
export const RD_CIRCLE_STRAFE = 2;
export const RD_CHASE = 3;
export const RD_INVESTIGATE = 4;
export const RD_HOLD_FIRE = 5;
export const RD_RETREAT = 6;

// Bitmask constants
const MASK_PATROL = 1 << RD_PATROL;           // 1
const MASK_PURSUE_FIRE = 1 << RD_PURSUE_FIRE; // 2
const MASK_CIRCLE_STRAFE = 1 << RD_CIRCLE_STRAFE; // 4
const MASK_CHASE = 1 << RD_CHASE;             // 8
const MASK_INVESTIGATE = 1 << RD_INVESTIGATE; // 16
const MASK_HOLD_FIRE = 1 << RD_HOLD_FIRE;     // 32
const MASK_RETREAT = 1 << RD_RETREAT;         // 64

// Posture bitmaps
const POSTURE_ASSAULT_MASK = MASK_PATROL | MASK_PURSUE_FIRE | MASK_CIRCLE_STRAFE | MASK_CHASE | MASK_INVESTIGATE;
const POSTURE_HOLD_MASK = MASK_HOLD_FIRE;
const POSTURE_RECON_MASK = MASK_PATROL | MASK_INVESTIGATE;
const POSTURE_RETREAT_MASK = MASK_RETREAT;

const POSTURE_MASKS: Record<string, number> = {
  "ASSAULT": POSTURE_ASSAULT_MASK,
  "HOLD": POSTURE_HOLD_MASK,
  "RECON": POSTURE_RECON_MASK,
  "RETREAT": POSTURE_RETREAT_MASK,
};

const INVESTIGATE_ARRIVAL_RADIUS = 2.0;
const PATROL_SPEED_MULT = 0.6;
const INVESTIGATE_SPEED_MULT = 0.7;
const WAYPOINT_ARRIVAL_THRESHOLD = 0.1;
const HYSTERESIS_THRESHOLD = 0.15;

// Pre-allocated module-scope working variables for Zero-GC pipeline
let targetExists = false;
let targetPosX = 0;
let targetPosY = 0;
let targetPosZ = 0;
let targetDx = 0;
let targetDz = 0;
let rdDist = 0;

let memoryExists = false;
let memPosX = 0;
let memPosY = 0;
let memPosZ = 0;
let memConfidence = 0;

let rdBestAction = -1;
let rdBestScore = -Infinity;

let pDx = 0;
let pDz = 0;
let pDist = 0;
let iDx = 0;
let iDz = 0;
let iDist = 0;
let awayDx = 0;
let awayDz = 0;
let awayDist = 0;
let sDx = 0;
let sDz = 0;
let sDist = 0;
let tempScore = 0;

export function robotDogBehavior(drone: any, ctx: BehaviorContext, out: BehaviorOutput) {
  const intel = INTEL_CONFIGS[DroneType.ROBOT_DOG];
  const conf = DRONE_CONFIGS[DroneType.ROBOT_DOG];
  const engagementMin = intel.engagementMin;
  const engagementMax = intel.engagementMax;
  const speed = conf.speed;

  const groupPosture = ctx.getGroupPosture(drone.groupId) || "ASSAULT";
  drone.posture = groupPosture;

  const postureMask = POSTURE_MASKS[groupPosture] !== undefined ? POSTURE_MASKS[groupPosture] : POSTURE_ASSAULT_MASK;

  // Target sensing
  targetExists = false;
  rdDist = 0;
  if (drone.mode === "COMBAT" && drone.combatTarget && drone.combatTarget.lastSensedPosition) {
    targetExists = true;
    targetPosX = drone.combatTarget.lastSensedPosition.x;
    targetPosY = drone.combatTarget.lastSensedPosition.y;
    targetPosZ = drone.combatTarget.lastSensedPosition.z;
    targetDx = targetPosX - drone.posX;
    targetDz = targetPosZ - drone.posZ;
    const dy = targetPosY - drone.posY;
    rdDist = Math.sqrt(targetDx * targetDx + dy * dy + targetDz * targetDz);
  }

  // Memory sensing (inlined scan, zero-GC)
  memoryExists = false;
  memPosX = 0;
  memPosY = 0;
  memPosZ = 0;
  memConfidence = 0;
  if (drone.memoryRecords) {
    for (const record of drone.memoryRecords.values()) {
      if (record.confidence > memConfidence && record.confidence > UNKNOWN_THRESHOLD) {
        memConfidence = record.confidence;
        memPosX = record.lastSensedPosition.x;
        memPosY = record.lastSensedPosition.y;
        memPosZ = record.lastSensedPosition.z;
        memoryExists = true;
      }
    }
  }

  // Sentinel initialization
  rdBestAction = -1;
  rdBestScore = -Infinity;

  // Manual scalar if scoring chain (Zero-GC, no sorting/arrays)
  // RD_RETREAT: score 2.0 unconditionally if RETREAT posture is active
  if ((postureMask & MASK_RETREAT) !== 0) {
    if (2.0 > rdBestScore) {
      rdBestScore = 2.0;
      rdBestAction = RD_RETREAT;
    }
  }

  // RD_HOLD_FIRE: score 2.0 unconditionally if HOLD posture is active
  if ((postureMask & MASK_HOLD_FIRE) !== 0) {
    if (2.0 > rdBestScore) {
      rdBestScore = 2.0;
      rdBestAction = RD_HOLD_FIRE;
    }
  }

  // RD_PURSUE_FIRE: score 1.0 if target exists and dist in [engagementMin, engagementMax]
  if ((postureMask & MASK_PURSUE_FIRE) !== 0 && targetExists && rdDist >= engagementMin && rdDist <= engagementMax) {
    tempScore = 1.0;
    if (tempScore > rdBestScore) {
      rdBestScore = tempScore;
      rdBestAction = RD_PURSUE_FIRE;
    }
  }

  // RD_CIRCLE_STRAFE: score 1.0 - (dist / engagementMin) if target exists and dist < engagementMin
  if ((postureMask & MASK_CIRCLE_STRAFE) !== 0 && targetExists && rdDist < engagementMin) {
    tempScore = 1.0 - (rdDist / engagementMin);
    if (tempScore > rdBestScore) {
      rdBestScore = tempScore;
      rdBestAction = RD_CIRCLE_STRAFE;
    }
  }

  // RD_CHASE: score min(1.0, (dist - engagementMax) / 50.0) if target exists and dist > engagementMax
  if ((postureMask & MASK_CHASE) !== 0 && targetExists && rdDist > engagementMax) {
    tempScore = Math.min(1.0, (rdDist - engagementMax) / 50.0);
    if (tempScore > rdBestScore) {
      rdBestScore = tempScore;
      rdBestAction = RD_CHASE;
    }
  }

  // RD_INVESTIGATE: score memory.confidence if memory record exists
  if ((postureMask & MASK_INVESTIGATE) !== 0 && memoryExists) {
    tempScore = memConfidence;
    if (tempScore > rdBestScore) {
      rdBestScore = tempScore;
      rdBestAction = RD_INVESTIGATE;
    }
  }

  // RD_PATROL: score 0.1 unconditionally if posture allows it
  if ((postureMask & MASK_PATROL) !== 0) {
    tempScore = 0.1;
    if (tempScore > rdBestScore) {
      rdBestScore = tempScore;
      rdBestAction = RD_PATROL;
    }
  }

  // Posture change resets old score before hysteresis evaluation
  if (drone.gearLastPosture !== groupPosture) {
    drone.gearActionScore = 0;
    drone.gearLastPosture = groupPosture;
  }

  // Hysteresis evaluation (0.15 threshold)
  if (rdBestAction === drone.gearActionId) {
    drone.gearActionScore = rdBestScore;
  } else if (rdBestScore >= drone.gearActionScore + HYSTERESIS_THRESHOLD) {
    drone.gearActionId = rdBestAction;
    drone.gearActionScore = rdBestScore;
  }

  // Execution behavior based on active drone.gearActionId
  switch (drone.gearActionId) {
    case RD_PURSUE_FIRE: {
      if (targetExists && rdDist > 0.001) {
        out.steerX = targetDx / rdDist;
        out.steerZ = targetDz / rdDist;
        out.targetSpeed = speed;
        out.shouldFire = true;
        out.forceHeadingX = targetDx / rdDist;
        out.forceHeadingZ = targetDz / rdDist;
      } else {
        // Fallback to patrol-waypoint steering if target guard fails
        const wp = (WAYPOINTS as any)[drone.zone] || WAYPOINTS[ZONES.SPAWN] || WAYPOINTS.zone_spawn;
        pDx = wp.x - drone.posX;
        pDz = wp.z - drone.posZ;
        pDist = Math.sqrt(pDx * pDx + pDz * pDz);
        if (pDist > 0.001) {
          out.steerX = pDx / pDist;
          out.steerZ = pDz / pDist;
          out.targetSpeed = speed * PATROL_SPEED_MULT;
        }
      }
      break;
    }

    case RD_CIRCLE_STRAFE: {
      if (targetExists && rdDist > 0.001) {
        out.steerX = -targetDz / rdDist;
        out.steerZ = targetDx / rdDist;
        out.targetSpeed = speed;
        out.forceHeadingX = targetDx / rdDist;
        out.forceHeadingZ = targetDz / rdDist;
      } else {
        // Fallback to patrol-waypoint steering if target guard fails
        const wp = (WAYPOINTS as any)[drone.zone] || WAYPOINTS[ZONES.SPAWN] || WAYPOINTS.zone_spawn;
        pDx = wp.x - drone.posX;
        pDz = wp.z - drone.posZ;
        pDist = Math.sqrt(pDx * pDx + pDz * pDz);
        if (pDist > 0.001) {
          out.steerX = pDx / pDist;
          out.steerZ = pDz / pDist;
          out.targetSpeed = speed * PATROL_SPEED_MULT;
        }
      }
      break;
    }

    case RD_CHASE: {
      if (targetExists && rdDist > 0.001) {
        out.steerX = targetDx / rdDist;
        out.steerZ = targetDz / rdDist;
        out.targetSpeed = speed;
        out.forceHeadingX = targetDx / rdDist;
        out.forceHeadingZ = targetDz / rdDist;
      } else {
        // Fallback to patrol-waypoint steering if target guard fails
        const wp = (WAYPOINTS as any)[drone.zone] || WAYPOINTS[ZONES.SPAWN] || WAYPOINTS.zone_spawn;
        pDx = wp.x - drone.posX;
        pDz = wp.z - drone.posZ;
        pDist = Math.sqrt(pDx * pDx + pDz * pDz);
        if (pDist > 0.001) {
          out.steerX = pDx / pDist;
          out.steerZ = pDz / pDist;
          out.targetSpeed = speed * PATROL_SPEED_MULT;
        }
      }
      break;
    }

    case RD_INVESTIGATE: {
      if (memoryExists) {
        iDx = memPosX - drone.posX;
        iDz = memPosZ - drone.posZ;
        iDist = Math.sqrt(iDx * iDx + iDz * iDz);
        if (iDist > INVESTIGATE_ARRIVAL_RADIUS) {
          if (iDist > 0.001) {
            out.steerX = iDx / iDist;
            out.steerZ = iDz / iDist;
            out.targetSpeed = speed * INVESTIGATE_SPEED_MULT;
          }
        } else {
          out.steerX = 0;
          out.steerZ = 0;
          out.targetSpeed = 0;
        }
      } else {
        // Fallback to patrol-waypoint steering if memory guard fails
        const wp = (WAYPOINTS as any)[drone.zone] || WAYPOINTS[ZONES.SPAWN] || WAYPOINTS.zone_spawn;
        pDx = wp.x - drone.posX;
        pDz = wp.z - drone.posZ;
        pDist = Math.sqrt(pDx * pDx + pDz * pDz);
        if (pDist > 0.001) {
          out.steerX = pDx / pDist;
          out.steerZ = pDz / pDist;
          out.targetSpeed = speed * PATROL_SPEED_MULT;
        }
      }
      break;
    }

    case RD_HOLD_FIRE: {
      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
      if (targetExists && rdDist > 0.001) {
        out.shouldFire = true;
        out.forceHeadingX = targetDx / rdDist;
        out.forceHeadingZ = targetDz / rdDist;
      }
      break;
    }

    case RD_RETREAT: {
      if (targetExists && rdDist > 0.001) {
        awayDx = drone.posX - targetPosX;
        awayDz = drone.posZ - targetPosZ;
        awayDist = Math.sqrt(awayDx * awayDx + awayDz * awayDz);
        if (awayDist > 0.001) {
          out.steerX = awayDx / awayDist;
          out.steerZ = awayDz / awayDist;
          out.targetSpeed = speed;
        }
      } else {
        const sWp = WAYPOINTS[ZONES.SPAWN] || WAYPOINTS.zone_spawn;
        sDx = sWp.x - drone.posX;
        sDz = sWp.z - drone.posZ;
        sDist = Math.sqrt(sDx * sDx + sDz * sDz);
        if (sDist > 0.001) {
          out.steerX = sDx / sDist;
          out.steerZ = sDz / sDist;
          out.targetSpeed = speed;
        }
      }
      break;
    }

    case RD_PATROL:
    default: {
      const wp = (WAYPOINTS as any)[drone.zone] || WAYPOINTS[ZONES.SPAWN] || WAYPOINTS.zone_spawn;
      pDx = wp.x - drone.posX;
      pDz = wp.z - drone.posZ;
      pDist = Math.sqrt(pDx * pDx + pDz * pDz);
      if (pDist > WAYPOINT_ARRIVAL_THRESHOLD) {
        if (pDist > 0.001) {
          out.steerX = pDx / pDist;
          out.steerZ = pDz / pDist;
          out.targetSpeed = speed * PATROL_SPEED_MULT;
        }
      } else {
        out.steerX = 0;
        out.steerZ = 0;
        out.targetSpeed = 0;
      }
      break;
    }
  }
}
