import { Buffer } from "node:buffer";
import { BenchmarkClientIdentity, BenchmarkInput } from "./scenario";

export type { BenchmarkClientIdentity, BenchmarkInput } from "./scenario";

export function createClientIdentity(prefix: string, roomIndex: number, clientIndex: number): BenchmarkClientIdentity {
  const suffix = `${roomIndex}-${clientIndex}`;
  return {
    roomIndex,
    clientIndex,
    matchId: `${prefix}-${roomIndex}`,
    uid: `benchmark-${suffix}`,
    displayName: `benchmark-${suffix}`,
  };
}

export function createInput(sequence: number, clientIndex: number): BenchmarkInput {
  return {
    sequence,
    moveForward: clientIndex % 2 === 0,
    pitch: 0,
    yaw: (clientIndex % 8) * 0.2,
  };
}

export function payloadSize(value: unknown): number {
  if (Buffer.isBuffer(value)) return value.byteLength;
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (ArrayBuffer.isView(value)) return value.byteLength;
  try {
    return Buffer.byteLength(JSON.stringify(value));
  } catch {
    return 0;
  }
}
