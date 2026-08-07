import { DroneType, DroneState } from "../../shared/constants";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { PlayerState, ServerDrone } from "../MatchRoom";
import { CollisionSystem } from "../../shared/collision";
import { evaluateDronePerception } from "./DronePerception";
import { updateDroneMemory, decayDroneMemory, getMemoryThreeState } from "./DroneMemory";

export { getMemoryThreeState, DECAY_RATE, UNKNOWN_THRESHOLD } from "./DroneMemory";
export type { MemoryRecord, MemoryThreeState } from "./DroneMemory";

export function processDroneIntelligence(
  nowMs: number,
  drones: ServerDrone[],
  players: Map<string, PlayerState>,
  rapierWorld: RAPIER.World | null,
  RAPIER_MOD: typeof RAPIER,
  dt: number = 0.0166,
  collisionMap: CollisionSystem | null = null
) {
  const livingPlayers: PlayerState[] = [];
  for (const player of players.values()) {
    if (player.isAlive && player.body) {
      livingPlayers.push(player);
    }
  }

  for (let i = 0; i < drones.length; i++) {
    const d = drones[i];
    if (d.state === DroneState.DEAD) continue;
    if (d.type === DroneType.TEST_ENTITY) continue;

    if (!d.memoryRecords) d.memoryRecords = [];
    d.playerInFOV = false;

    // Reset touched flags for Zero-GC memory tracking
    const records = d.memoryRecords;
    for (let r = 0; r < records.length; r++) {
      records[r].touchedThisTick = false;
    }

    for (const player of livingPlayers) {
      const perception = evaluateDronePerception(d, player, nowMs, rapierWorld, RAPIER_MOD, collisionMap);
      if (perception.detected) {
        d.playerInFOV = true;
      }
      updateDroneMemory(d, perception, nowMs, dt);
    }

    decayDroneMemory(d, dt);

    // STATE MACHINE SYNCHRONIZER
    let bestRecord: any = null;
    let maxConf = 0;
    for (let r = 0; r < records.length; r++) {
      if (records[r].confidence > maxConf) {
        maxConf = records[r].confidence;
        bestRecord = records[r];
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
