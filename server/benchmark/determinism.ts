/**
 * VEXEA Determinism & Seed Configuration
 */

let globalSeed = 1337;

export function setDeterminismSeed(seed: number): void {
  globalSeed = seed;
}

export function getDeterminismSeed(): number {
  return globalSeed;
}

// Simple Mulberry32 PRNG for deterministic random values during benchmarking
export function pseudoRandom(): number {
  let t = (globalSeed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
