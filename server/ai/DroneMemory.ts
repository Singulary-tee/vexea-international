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
export function createMemoryMap(initial?: Iterable<[string, MemoryRecord]> | MemoryRecord[] | null): Map<string, MemoryRecord> {
  const map = new Map<string, MemoryRecord>();
  if (initial) {
    if (Array.isArray(initial)) {
      for (const r of initial) {
        if (r && r.entityId) {
          map.set(r.entityId, r);
        }
      }
    } else if (Symbol.iterator in Object(initial)) {
      for (const [k, v] of initial as Iterable<[string, MemoryRecord]>) {
        map.set(k, v);
      }
    }
  }

  return new Proxy(map, {
    get(target, prop, receiver) {
      if (prop === 'length') {
        return target.size;
      }
      if (typeof prop === 'string') {
        const num = Number(prop);
        if (Number.isInteger(num) && num >= 0) {
          let idx = 0;
          for (const val of target.values()) {
            if (idx === num) return val;
            idx++;
          }
          return undefined;
        }
      }
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return val.bind(target);
      }
      return val;
    }
  });
}

export function updateDroneMemory(
  drone: ServerDrone,
  perception: PerceptionResult,
  nowMs: number,
  dt: number = 0.0166
): void {
  if (!drone.memoryRecords || Array.isArray(drone.memoryRecords)) {
    drone.memoryRecords = createMemoryMap(drone.memoryRecords as any);
  }

  const { playerId, detected, heard, reactedToDamage, sightConfidence, soundConfidence, damageConfidence, targetPos } = perception;

  if (detected || heard || reactedToDamage) {
    let record = drone.memoryRecords.get(playerId);
    if (!record) {
      record = {
        entityId: playerId,
        lastSensedPosition: { x: 0, y: 0, z: 0 },
        timeLastSensed: 0,
        confidence: 0
      };
      drone.memoryRecords.set(playerId, record);
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
    record.lastSensedPosition.x = targetPos.x;
    record.lastSensedPosition.y = targetPos.y;
    record.lastSensedPosition.z = targetPos.z;
    record.timeLastSensed = nowMs / 1000;
    record.touchedThisTick = true;
  }
}

/**
 * Applies time-based confidence decay for untouched memory records.
 * Resets touchedThisTick to false on all records after decay processing.
 */
export function decayDroneMemory(
  drone: ServerDrone,
  dt: number = 0.0166
): void {
  if (!drone.memoryRecords) return;
  if (Array.isArray(drone.memoryRecords)) {
    drone.memoryRecords = createMemoryMap(drone.memoryRecords);
  }

  const droneConfig = DRONE_CONFIGS[drone.type as DroneType];
  const decayRate = droneConfig?.decayRate ?? DECAY_RATE;

  for (const record of drone.memoryRecords.values()) {
    if (!record.touchedThisTick) {
      record.confidence = Math.max(0, record.confidence - decayRate * dt);
    }
    record.touchedThisTick = false;
  }
}

/**
 * Deletes memory records whose confidence has decayed to or below the given threshold.
 * Prevents memory leak / stale entity tracking over long matches.
 */
export function forgetStaleMemory(
  drone: ServerDrone,
  threshold: number = UNKNOWN_THRESHOLD
): void {
  if (!drone.memoryRecords) return;
  if (Array.isArray(drone.memoryRecords)) {
    drone.memoryRecords = createMemoryMap(drone.memoryRecords);
  }

  for (const [entityId, record] of drone.memoryRecords.entries()) {
    if (record.confidence <= threshold) {
      drone.memoryRecords.delete(entityId);
    }
  }
}
