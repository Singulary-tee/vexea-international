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
  const slot = args?.weaponSlot as "primary" | "secondary";
  const isPrimary = slot === "primary";

  const originX = typeof args?.origin?.x === "number" ? args.origin.x : pState.posX;
  const originY = typeof args?.origin?.y === "number" ? args.origin.y : pState.posY + 1.6;
  const originZ = typeof args?.origin?.z === "number" ? args.origin.z : pState.posZ;
  const originObj = { x: originX, y: originY, z: originZ };

  const defaultDirX = Math.sin(pState.yaw || 0) * Math.cos(pState.pitch || 0);
  const defaultDirY = Math.sin(pState.pitch || 0);
  const defaultDirZ = Math.cos(pState.yaw || 0) * Math.cos(pState.pitch || 0);

  const dirX = typeof args?.direction?.x === "number" ? args.direction.x : defaultDirX;
  const dirY = typeof args?.direction?.y === "number" ? args.direction.y : defaultDirY;
  const dirZ = typeof args?.direction?.z === "number" ? args.direction.z : defaultDirZ;
  const timestamp = typeof args?.timestamp === "number" ? args.timestamp : Date.now();
  const now = Date.now();

  // Hitscan Origin Verification
  if (args?.origin && typeof args.origin.x === "number") {
    const dx = originX - pState.posX;
    const dy = originY - (pState.posY + 1.6);
    const dz = originZ - pState.posZ;
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
  }

  const history = currentRoom.historicalAABBHistory || (currentRoom as any).combatResolver?.historicalAABBHistory;
  const historyIdx = currentRoom.historicalAABBIndex ?? (currentRoom as any).combatResolver?.historicalAABBIndex ?? 0;
  const dronesList = currentRoom.drones || ((currentRoom as any).getDrones ? (currentRoom as any).getDrones() : []);
  const serverTickVal = currentRoom.serverTick || ((currentRoom as any).getServerTick ? (currentRoom as any).getServerTick() : 0);

  const expectedT = Date.now() - pState.ping;
  let targetTick = serverTickVal;
  if (Math.abs(timestamp - expectedT) <= 50) {
    const rewindMs = Math.min(200, Date.now() - timestamp);
    targetTick = serverTickVal - Math.floor(rewindMs / 16.66);
  } else {
    recordHitscanRejected("lag_compensation_out_of_bounds");
  }

  let distSqMin = 99999;
  let bestHitDrone: any = null;

  if (history) {
    const tickDelta = serverTickVal - targetTick;
    let targetSlot = -1;
    if (tickDelta >= 0 && tickDelta < HISTORICAL_SAMPLES_MAX) {
      const predictedSlot = (historyIdx - 1 - tickDelta + HISTORICAL_SAMPLES_MAX * 2) % HISTORICAL_SAMPLES_MAX;
      const baseIdx = predictedSlot * HISTORIC_BLOCK_SIZE;
      const recTick = history[baseIdx];
      if (recTick > 0 && Math.abs(recTick - targetTick) <= 1) {
        targetSlot = predictedSlot;
      } else {
        const prevSlot = (predictedSlot - 1 + HISTORICAL_SAMPLES_MAX) % HISTORICAL_SAMPLES_MAX;
        const nextSlot = (predictedSlot + 1) % HISTORICAL_SAMPLES_MAX;
        if (Math.abs(history[prevSlot * HISTORIC_BLOCK_SIZE] - targetTick) <= 1) {
          targetSlot = prevSlot;
        } else if (Math.abs(history[nextSlot * HISTORIC_BLOCK_SIZE] - targetTick) <= 1) {
          targetSlot = nextSlot;
        }
      }
    }

    const slotStart = targetSlot !== -1 ? targetSlot : 0;
    const slotEnd = targetSlot !== -1 ? targetSlot + 1 : HISTORICAL_SAMPLES_MAX;

    for (let i = slotStart; i < slotEnd; i++) {
      const baseIdx = i * HISTORIC_BLOCK_SIZE;
      const recTick = history[baseIdx];
      if (recTick > 0 && Math.abs(recTick - targetTick) <= 1) {
        const numDrones = history[baseIdx + 1];
        for (let dIdx = 0; dIdx < numDrones; dIdx++) {
          const offset = baseIdx + 2 + dIdx * 4;
          const dId = history[offset];
          const cx = history[offset + 1];
          const cy = history[offset + 2];
          const cz = history[offset + 3];

          const tox = cx - originX;
          const toy = cy - originY;
          const toz = cz - originZ;

          const t = tox * dirX + toy * dirY + toz * dirZ;
          if (t > 0) {
            const px = originX + dirX * t;
            const py = originY + dirY * t;
            const pz = originZ + dirZ * t;

            const hitDrone = dronesList.find((d: any) => d.id === dId);
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
  }

  if (bestHitDrone) {
    if (
      currentRoom.collisionMap &&
      currentRoom.collisionMap.rayIntersectsAny(
        originObj,
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

      const impactX = originX + dirX * distSqMin;
      const impactY = originY + dirY * distSqMin;
      const impactZ = originZ + dirZ * distSqMin;

      pState.channel.emit("reliable_event", {
        type: "HIT_CONFIRMED",
        droneId: bestHitDrone.id,
        droneHp: 0,
        originX,
        originY,
        originZ,
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
      const impactX = originX + dirX * distSqMin;
      const impactY = originY + dirY * distSqMin;
      const impactZ = originZ + dirZ * distSqMin;

      pState.channel.emit("reliable_event", {
        type: "HIT_CONFIRMED",
        droneId: bestHitDrone.id,
        droneHp: bestHitDrone.hp,
        originX,
        originY,
        originZ,
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
        originObj,
        { x: dirX, y: dirY, z: dirZ }
      );
      const hit = currentRoom.rapierWorld.castRay(
        ray,
        80,
        false,
        RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC
      );
      if (hit) {
        impactX = originX + dirX * hit.timeOfImpact;
        impactY = originY + dirY * hit.timeOfImpact;
        impactZ = originZ + dirZ * hit.timeOfImpact;
      } else {
        impactX = originX + dirX * 80;
        impactY = originY + dirY * 80;
        impactZ = originZ + dirZ * 80;
      }
    } else {
      impactX = originX + dirX * 80;
      impactY = originY + dirY * 80;
      impactZ = originZ + dirZ * 80;
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
        originX,
        originY,
        originZ,
        impactX,
        impactY,
        impactZ,
      });
    }
  }
}
