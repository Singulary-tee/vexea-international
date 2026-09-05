import { DroneType, DroneState } from "../../shared/constants";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { PlayerState, ServerDrone } from "../MatchRoom";
import { CollisionSystem } from "../../shared/collision";
import { evaluateDronePerception } from "./DronePerception";
import { updateDroneMemory, decayDroneMemory, forgetStaleMemory, getMemoryThreeState, createMemoryMap, MemoryRecord } from "./DroneMemory";

export { getMemoryThreeState, forgetStaleMemory, DECAY_RATE, UNKNOWN_THRESHOLD } from "./DroneMemory";
export type { MemoryRecord, MemoryThreeState } from "./DroneMemory";

// Zero-GC scratch array to prevent tick-rate allocations
const _livingPlayersScratch: PlayerState[] = [];

export function processDroneIntelligence(
  nowMs: number,
  drones: ServerDrone[],
  players: Map<string, PlayerState>,
  rapierWorld: RAPIER.World | null,
  RAPIER_MOD: typeof RAPIER,
  dt: number = 0.0166,
  collisionMap: CollisionSystem | null = null
) {
  _livingPlayersScratch.length = 0;
  for (const player of players.values()) {
    if (player.isAlive && player.body) {
      _livingPlayersScratch.push(player);
    }
  }

  for (let i = 0; i < drones.length; i++) {
    const d = drones[i];
    if (d.state === DroneState.DEAD) continue;
    if (d.type === DroneType.TEST_ENTITY) continue;

    if (!d.memoryRecords || Array.isArray(d.memoryRecords)) {
      d.memoryRecords = createMemoryMap(d.memoryRecords as any);
    }
    d.playerInFOV = false;

    // ARCH-04: Non-recon drones staggered across 4 ticks (15Hz evaluation), recon drones staggered across 2 ticks (30Hz)
    const isRecon = d.type === DroneType.RECON;
    const staggerMod = isRecon ? 2 : 4;
    const idVal = d.id as unknown;
    const idHash = typeof idVal === 'number' ? idVal : (typeof idVal === 'string' && idVal.length > 0 ? (idVal.charCodeAt(idVal.length - 1) || 0) : i);

    for (let pIdx = 0; pIdx < _livingPlayersScratch.length; pIdx++) {
      const player = _livingPlayersScratch[pIdx];
      const isHighAlert = d.state === DroneState.ATTACKING || d.state === DroneState.PURSUING || d.playerInFOV;
      const isTurn = isHighAlert || player.firedThisTick || !d.memoryRecords.has(player.id) || (((idHash + Math.floor(nowMs / 16.66)) % staggerMod) === 0);
      if (isTurn) {
        const perception = evaluateDronePerception(d, player, nowMs, rapierWorld, RAPIER_MOD, collisionMap);
        if (perception.detected) {
          d.playerInFOV = true;
        }
        updateDroneMemory(d, perception, nowMs, dt);
      }
    }

    decayDroneMemory(d, dt);
    forgetStaleMemory(d);

    // STATE MACHINE SYNCHRONIZER
    let bestRecord: MemoryRecord | null = null;
    let maxConf = 0;
    for (const record of d.memoryRecords.values()) {
      if (record.confidence > maxConf) {
        maxConf = record.confidence;
        bestRecord = record;
      }
    }

    const classification = getMemoryThreeState(maxConf);

    if (classification === 'confirmed' || classification === 'last_seen') {
      if (d.mode === "NORMAL") {
        d.mode = "COMBAT";
      }
      d.combatTarget = bestRecord;
    } else {
      if (d.mode === "COMBAT") {
        const isCommittedBomber = d.type === DroneType.BOMBER && d.bomberState === "COMMITTED";
        if (!isCommittedBomber) {
          d.mode = "NORMAL";
          d.combatTarget = null;
        }
      } else {
        d.combatTarget = null;
      }
    }
  }
}
