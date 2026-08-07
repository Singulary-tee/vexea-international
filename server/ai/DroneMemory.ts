import { DroneType, DRONE_CONFIGS } from "../../shared/constants";
import type { ServerDrone } from "../MatchRoom";
import type { PerceptionResult } from "./DronePerception";

export interface MemoryRecord {
  entityId: string;
  lastSensedPosition: { x: number; y: number; z: number };
  timeLastSensed: number;
  confidence: number;
  touchedThisTick?: boolean;
}

export const DECAY_RATE = 1.0 / 15.0; // Decay from 1.0 to 0.0 in ~15 seconds
export const UNKNOWN_THRESHOLD = 0.2;

export type MemoryThreeState = 'confirmed' | 'last_seen' | 'unknown';

export function getMemoryThreeState(confidence: number): MemoryThreeState {
  if (confidence === 1.0) {
    return 'confirmed';
  } else if (confidence > UNKNOWN_THRESHOLD && confidence < 1.0) {
    return 'last_seen';
  } else {
    return 'unknown';
  }
}

/**
 * Updates drone memory record based on perception inputs (sight, sound, damage).
 * Enforces perception confidence rules:
 * - Sight (detected) -> confidence = 1.0 ('confirmed')
 * - Sound (heard) -> confidence = 0.75 ('last_seen') - allows investigating sound without wall-tracking
 * - Damage -> confidence = 0.85 ('last_seen')
 */
export function updateDroneMemory(
  drone: ServerDrone,
  perception: PerceptionResult,
  nowMs: number,
  dt: number = 0.0166
): void {
  if (!drone.memoryRecords) {
    drone.memoryRecords = [];
  }

  const { playerId, detected, heard, reactedToDamage, sightConfidence, soundConfidence, damageConfidence, targetPos } = perception;

  if (detected || heard || reactedToDamage) {
    let record = drone.memoryRecords.find((r: MemoryRecord) => r.entityId === playerId);
    if (!record) {
      record = {
        entityId: playerId,
        lastSensedPosition: { x: 0, y: 0, z: 0 },
        timeLastSensed: 0,
        confidence: 0
      };
      drone.memoryRecords.push(record);
    }

    let targetConfidence = 0;
    if (detected) {
      targetConfidence = sightConfidence; // 1.0 -> 'confirmed'
    } else if (heard) {
      targetConfidence = soundConfidence; // 0.75 -> 'last_seen'
    } else if (reactedToDamage) {
      targetConfidence = damageConfidence; // 0.85 -> 'last_seen'
    }

    // Set or elevate confidence (never decrease via sensing, only decay)
    record.confidence = Math.max(record.confidence, targetConfidence);
    record.lastSensedPosition = { x: targetPos.x, y: targetPos.y, z: targetPos.z };
    record.timeLastSensed = nowMs / 1000;
    record.touchedThisTick = true;
  }
}

/**
 * Applies time-based confidence decay for untouched memory records.
 */
export function decayDroneMemory(
  drone: ServerDrone,
  dt: number = 0.0166
): void {
  if (!drone.memoryRecords) return;

  const droneConfig = DRONE_CONFIGS[drone.type as DroneType];
  const decayRate = droneConfig?.decayRate ?? DECAY_RATE;

  for (let i = 0; i < drone.memoryRecords.length; i++) {
    const record = drone.memoryRecords[i];
    if (!record.touchedThisTick) {
      record.confidence = Math.max(0, record.confidence - decayRate * dt);
    }
  }
}
