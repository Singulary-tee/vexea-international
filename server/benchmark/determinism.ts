let globalSeed = 1337;

export function setDeterminismSeed(seed: number): void {
  globalSeed = seed >>> 0;
}

export function getDeterminismSeed(): number {
  return globalSeed;
}

export function pseudoRandom(): number {
  let value = (globalSeed += 0x6d2b79f5);
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

const configuredSeed = Number(process.env.VEXEA_BENCHMARK_SEED);
if (Number.isInteger(configuredSeed)) {
  setDeterminismSeed(configuredSeed);
  Math.random = pseudoRandom;
}
