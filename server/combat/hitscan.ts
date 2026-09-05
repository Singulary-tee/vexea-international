import { MatchRoom, PlayerState } from "../MatchRoom";
import { ChannelAdapter } from "../transport/adapter";
import { 
  DRONE_CONFIGS, 
  DroneType, 
  DroneState, 
  HISTORICAL_SAMPLES_MAX, 
  HISTORIC_BLOCK_SIZE 
} from "../../shared/constants";
import { getWeaponPerformance } from "../../shared/constants";
import { calculateDamageWithFalloff } from "../../shared/weapons";
import { 
  recordHitscanRejected, 
  recordSecurityExploit 
} from "../sentry";
import RAPIER from "@dimforge/rapier3d-compat";

export function processHitscan(
  pState: PlayerState,
  currentRoom: MatchRoom,
  channel: ChannelAdapter,
  args: any
): void {
  const slot = args.weaponSlot as "primary" | "secondary";
  const isPrimary = slot === "primary";
  const dirX = args.direction.x;
  const dirY = args.direction.y;
  const dirZ = args.direction.z;
  const timestamp = args.timestamp;
  const now = Date.now();

  // Hitscan Origin Verification
  const dx = args.origin.x - pState.posX;
  const dy = args.origin.y - pState.posY;
  const dz = args.origin.z - pState.posZ;
  const originDistSq = dx * dx + dy * dy + dz * dz;
  const maxAllowedDeviation = 4.0; // 2.0 meters squared (2.0 * 2.0 = 4.0)

  if (originDistSq > maxAllowedDeviation) {
    console.warn(`[Hitscan Verification] Rejected shot from player ${pState.id}: Origin deviation too high (${Math.sqrt(originDistSq).toFixed(2)}m > 2.0m)`);
    recordHitscanRejected("origin_deviation_out_of_bounds");
    recordSecurityExploit("origin_spoofing", { 
      playerId: pState.id, 
      origin: args.origin, 
      expected: { x: pState.posX, y: pState.posY, z: pState.posZ } 
    });
    return;
  }

  const expectedT = Date.now() - pState.ping;
  let targetTick = currentRoom.serverTick;
  if (Math.abs(timestamp - expectedT) <= 50) {
    const rewindMs = Math.min(200, Date.now() - timestamp);
    targetTick = currentRoom.serverTick - Math.floor(rewindMs / 16.66);
  } else {
    recordHitscanRejected("lag_compensation_out_of_bounds");
  }

  let distSqMin = 99999;
  let bestHitDrone: any = null;

  const tickDelta = currentRoom.serverTick - targetTick;
  let targetSlot = -1;
  if (tickDelta >= 0 && tickDelta < HISTORICAL_SAMPLES_MAX) {
    const predictedSlot = (currentRoom.historicalAABBIndex - 1 - tickDelta + HISTORICAL_SAMPLES_MAX * 2) % HISTORICAL_SAMPLES_MAX;
    const baseIdx = predictedSlot * HISTORIC_BLOCK_SIZE;
    const recTick = currentRoom.historicalAABBHistory[baseIdx];
    if (recTick > 0 && Math.abs(recTick - targetTick) <= 1) {
      targetSlot = predictedSlot;
    } else {
      const prevSlot = (predictedSlot - 1 + HISTORICAL_SAMPLES_MAX) % HISTORICAL_SAMPLES_MAX;
      const nextSlot = (predictedSlot + 1) % HISTORICAL_SAMPLES_MAX;
      if (Math.abs(currentRoom.historicalAABBHistory[prevSlot * HISTORIC_BLOCK_SIZE] - targetTick) <= 1) {
        targetSlot = prevSlot;
      } else if (Math.abs(currentRoom.historicalAABBHistory[nextSlot * HISTORIC_BLOCK_SIZE] - targetTick) <= 1) {
        targetSlot = nextSlot;
      }
    }
  }

  const slotStart = targetSlot !== -1 ? targetSlot : 0;
  const slotEnd = targetSlot !== -1 ? targetSlot + 1 : HISTORICAL_SAMPLES_MAX;

  for (let i = slotStart; i < slotEnd; i++) {
    const baseIdx = i * HISTORIC_BLOCK_SIZE;
    const recTick = currentRoom.historicalAABBHistory[baseIdx];
    if (recTick > 0 && Math.abs(recTick - targetTick) <= 1) {
      const numDrones = currentRoom.historicalAABBHistory[baseIdx + 1];
      for (let dIdx = 0; dIdx < numDrones; dIdx++) {
        const offset = baseIdx + 2 + dIdx * 4;
        const dId = currentRoom.historicalAABBHistory[offset];
        const cx = currentRoom.historicalAABBHistory[offset + 1];
        const cy = currentRoom.historicalAABBHistory[offset + 2];
        const cz = currentRoom.historicalAABBHistory[offset + 3];

        const tox = cx - args.origin.x;
        const toy = cy - args.origin.y;
        const toz = cz - args.origin.z;

        const t = tox * dirX + toy * dirY + toz * dirZ;
        if (t > 0) {
          const px = args.origin.x + dirX * t;
          const py = args.origin.y + dirY * t;
          const pz = args.origin.z + dirZ * t;

          const hitDrone = currentRoom.drones.find((d) => d.id === dId);
          if (!hitDrone || hitDrone.state === DroneState.DEAD) continue;

          // shooter cannot hit themselves (if they were a drone, which they aren't, but safety first)
          if (hitDrone.id.toString() === pState.id) {
            continue;
          }

          const config = DRONE_CONFIGS[hitDrone.type];
          let w = 1.0;
          let h = 1.0;
          let l = 1.0;
          if (config && config.collider) {
            if (config.collider.type === 'cuboid' && config.collider.halfExtents) {
              w = config.collider.halfExtents[0] * 2;
              h = config.collider.halfExtents[1] * 2;
              l = config.collider.halfExtents[2] * 2;
            } else if (config.collider.type === 'capsule' && config.collider.radius !== undefined && config.collider.halfHeight !== undefined) {
              w = config.collider.radius * 2;
              h = (config.collider.halfHeight * 2) + (config.collider.radius * 2);
              l = config.collider.radius * 2;
            } else if (config.collider.radius !== undefined) {
              w = config.collider.radius * 2;
              h = config.collider.radius * 2;
              l = config.collider.radius * 2;
            }
          }

          if (
            Math.abs(px - cx) <= w / 2 &&
            Math.abs(py - cy) <= h / 2 &&
            Math.abs(pz - cz) <= l / 2
          ) {
            if (t < distSqMin) {
              distSqMin = t;
              bestHitDrone = hitDrone;
            }
          }
        }
      }
      break;
    }
  }

  if (bestHitDrone) {
    if (
      currentRoom.collisionMap &&
      currentRoom.collisionMap.rayIntersectsAny(
        args.origin,
        { x: dirX, y: dirY, z: dirZ },
        distSqMin
      )
    ) {
      bestHitDrone = null;
    }
  }

  if (bestHitDrone) {
    const weaponPerf = getWeaponPerformance(pState.weaponState[isPrimary ? "primary" : "secondary"].weaponId);
    if (!weaponPerf) return;
    const distance = distSqMin;
    const rawDamage = calculateDamageWithFalloff(
      weaponPerf.damage,
      distance,
      weaponPerf.falloff
    );
    const appliedDamage = Math.round(rawDamage * 10) / 10;

    bestHitDrone.hp -= appliedDamage;
    pState.stats.damageDealt += appliedDamage;
    bestHitDrone.damageLog.push({ playerId: pState.id, timestamp: now });

    if (bestHitDrone.hp <= 0) {
      currentRoom.despawnDrone(bestHitDrone);
      pState.stats.droneEliminations++;
      pState.stats.scoreIndividual += 100;
      pState.score += 100;

      const assistThreshold = now - 5000;
      const assistants = new Set<string>();
      for (const rec of bestHitDrone.damageLog) {
        if (rec.playerId !== pState.id && rec.timestamp > assistThreshold) {
          assistants.add(rec.playerId);
        }
      }
      for (const aId of assistants) {
        const aPlayer = currentRoom.players.get(aId);
        if (aPlayer) {
          aPlayer.stats.assists++;
          aPlayer.stats.scoreIndividual += 50;
          aPlayer.score += 50;
        }
      }
      bestHitDrone.damageLog = [];

      if (
        bestHitDrone.path &&
        bestHitDrone.path.length > 0 &&
        bestHitDrone.pathIndex < bestHitDrone.path.length
      ) {
        currentRoom.failedOperations.push(
          JSON.stringify({
            attempted: "active_operation",
            reason: "unit_destroyed",
            droneType: bestHitDrone.type,
          })
        );
      }

      const impactX = args.origin.x + dirX * distSqMin;
      const impactY = args.origin.y + dirY * distSqMin;
      const impactZ = args.origin.z + dirZ * distSqMin;

      pState.channel.emit("reliable_event", {
        type: "HIT_CONFIRMED",
        droneId: bestHitDrone.id,
        droneHp: 0,
        originX: args.origin.x,
        originY: args.origin.y,
        originZ: args.origin.z,
        impactX,
        impactY,
        impactZ,
      });
      currentRoom.broadcastReliableEvent({
        type: "DRONE_DEATH",
        droneId: bestHitDrone.id,
        zone: bestHitDrone.zone,
      });
    } else {
      const impactX = args.origin.x + dirX * distSqMin;
      const impactY = args.origin.y + dirY * distSqMin;
      const impactZ = args.origin.z + dirZ * distSqMin;

      pState.channel.emit("reliable_event", {
        type: "HIT_CONFIRMED",
        droneId: bestHitDrone.id,
        droneHp: bestHitDrone.hp,
        originX: args.origin.x,
        originY: args.origin.y,
        originZ: args.origin.z,
        impactX,
        impactY,
        impactZ,
      });
      currentRoom.broadcastReliableEvent({
        type: "DRONE_HIT",
        droneId: bestHitDrone.id,
        zone: bestHitDrone.zone,
      });
    }
  } else {
    let impactX: number;
    let impactY: number;
    let impactZ: number;

    if (currentRoom.rapierWorld) {
      const ray = new RAPIER.Ray(
        { x: args.origin.x, y: args.origin.y, z: args.origin.z },
        { x: dirX, y: dirY, z: dirZ }
      );
      const hit = currentRoom.rapierWorld.castRay(
        ray,
        80,
        false,
        RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC
      );
      if (hit) {
        impactX = args.origin.x + args.direction.x * hit.timeOfImpact;
        impactY = args.origin.y + args.direction.y * hit.timeOfImpact;
        impactZ = args.origin.z + args.direction.z * hit.timeOfImpact;
      } else {
        impactX = args.origin.x + args.direction.x * 80;
        impactY = args.origin.y + args.direction.y * 80;
        impactZ = args.origin.z + args.direction.z * 80;
      }
    } else {
      impactX = args.origin.x + args.direction.x * 80;
      impactY = args.origin.y + args.direction.y * 80;
      impactZ = args.origin.z + args.direction.z * 80;
    }

    if (
      typeof impactX === "number" &&
      !isNaN(impactX) &&
      typeof impactY === "number" &&
      !isNaN(impactY) &&
      typeof impactZ === "number" &&
      !isNaN(impactZ)
    ) {
      pState.channel.emit("reliable_event", {
        type: "HIT_ENVIRONMENT",
        originX: args.origin.x,
        originY: args.origin.y,
        originZ: args.origin.z,
        impactX,
        impactY,
        impactZ,
      });
    }
  }
}
