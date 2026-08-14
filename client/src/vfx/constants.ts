/**
 * VFX Constants and Configuration
 * Keeps all magic numbers and tuning parameters externalized.
 */

export const VFX_CONSTANTS = {
  // Firing / Muzzle Flash Settings (Niagara-style)
  FIRING: {
    FLASH_DURATION: 0.08, // in seconds
    FLASH_SCALE_MULTIPLIER: 1.2,
    LIGHT_INTENSITY: 25.0,
    LIGHT_DECAY: 2.0,
    LIGHT_DISTANCE: 8.0,
    LIGHT_COLOR: 0xFF4500, // Matched to DS.colors.accent
    CORE_COLOR: [1.0, 1.0, 1.0], // Inner core hot white
    EDGE_COLOR: [1.0, 0.27, 0.0], // Outer gas plume orange-red (#FF4500 normalized)
    
    SPIKE_COUNT: 4,
    SPIKE_LENGTH: 1.5,
    SPIKE_WIDTH: 0.25,
    
    SMOKE_LIFETIME: 30, // in frames
    SMOKE_GROWTH_SPEED: 0.45,
    SMOKE_RISE_SPEED: 0.02,
  },

  // Hit & Impact Effects (Sparks, Decals, Dirt)
  HITS: {
    SPARK_LIFETIME: 10, // frames
    SPARK_SPEED_MIN: 3.0,
    SPARK_SPEED_MAX: 9.0,
    SPARK_GRAVITY: 9.81,
    SPARK_SIZE: 0.10,
    SPARK_DECAY_RATE: 0.95,
    
    DUST_LIFETIME: 25, // frames
    DUST_RISE_SPEED: 1.8,
    DUST_SPREAD_SPEED: 1.2,
    DUST_SIZE_START: 0.15,
    DUST_SIZE_END: 0.55,
    
    DECAL_SIZE: 0.35,
    DECAL_OFFSET_FACTOR: -5,
  },

  // Large Effects (Explosions, Fire, Smoke)
  LARGE: {
    EXPLOSION_LIFETIME: 0.8, // seconds
    EXPLOSION_SPARKS: 40,
    EXPLOSION_SMOKE_PLUMES: 15,
    EXPLOSION_LIGHT_INTENSITY: 80.0,
    EXPLOSION_LIGHT_DISTANCE: 25.0,
    EXPLOSION_EXPANSION_RATE: 2.0,
    
    FIRE_PARTICLES: 12,
    FIRE_LIFETIME: 40, // frames
    FIRE_RISE_SPEED: 0.04,
    FIRE_SIZE: 0.6,
  },

  // Authored Flipbook Manifest Metadata & Config
  FLIPBOOKS: {
    ENTRIES: {
      cloud_01: { key: 'cloud_01_8x8_q90.webp', cols: 8, rows: 8, frameCount: 64, duration: 0.8, effect: 'smoke', luminanceKeyed: false, additive: false },
      cloud_02: { key: 'cloud_02_8x8_q90.webp', cols: 8, rows: 8, frameCount: 64, duration: 0.8, effect: 'smoke', luminanceKeyed: false, additive: false },
      explosion_01: { key: 'explosion_01_8x8_q90.webp', cols: 8, rows: 8, frameCount: 64, duration: 0.75, effect: 'explosion', luminanceKeyed: false, additive: true },
      explosion_02: { key: 'explosion_02_8x8_q90.webp', cols: 8, rows: 8, frameCount: 64, duration: 0.75, effect: 'explosion', luminanceKeyed: false, additive: true },
      explosion_smoke_01: { key: 'explosion_smoke_01_8x8_q90.webp', cols: 8, rows: 8, frameCount: 64, duration: 0.9, effect: 'explosion', luminanceKeyed: false, additive: false },
      fire_01: { key: 'fire_01_8x8_q90.webp', cols: 8, rows: 8, frameCount: 64, duration: 1.0, effect: 'fire', luminanceKeyed: true, additive: true },
      fire_02: { key: 'fire_02_8x8_q90.webp', cols: 8, rows: 8, frameCount: 64, duration: 1.0, effect: 'fire', luminanceKeyed: true, additive: true },
      fire_03: { key: 'fire_03_8x8_q90.webp', cols: 8, rows: 8, frameCount: 64, duration: 1.0, effect: 'fire', luminanceKeyed: true, additive: true },
      fire_04: { key: 'fire_04_8x8_q90.webp', cols: 8, rows: 8, frameCount: 64, duration: 1.0, effect: 'fire', luminanceKeyed: true, additive: true },
      flame_01: { key: 'flame_01_16x4_q90.webp', cols: 16, rows: 4, frameCount: 64, duration: 1.0, effect: 'fire', luminanceKeyed: false, additive: true },
      flame_02: { key: 'flame_02_15x4_q90.webp', cols: 8, rows: 4, frameCount: 32, duration: 0.8, effect: 'fire', luminanceKeyed: false, additive: true },
      muzzle_flash_01: { key: 'muzzle_flash_01_5frame_q90.webp', cols: 5, rows: 1, frameCount: 5, duration: 0.08, effect: 'muzzle_flash', luminanceKeyed: false, additive: true },
      wispy_smoke_01: { key: 'wispy_smoke_01_8x8_q90.webp', cols: 8, rows: 8, frameCount: 64, duration: 0.65, effect: 'smoke', luminanceKeyed: false, additive: false },
      wispy_smoke_02: { key: 'wispy_smoke_02_8x8_q90.webp', cols: 8, rows: 8, frameCount: 64, duration: 0.65, effect: 'smoke', luminanceKeyed: false, additive: false },
      wispy_smoke_03: { key: 'wispy_smoke_03_8x8_q90.webp', cols: 8, rows: 8, frameCount: 64, duration: 0.65, effect: 'smoke', luminanceKeyed: false, additive: false },
    },
    STATIC_LAYERS: {
      circles: ['circle_01_a.webp', 'circle_02_a.webp', 'circle_03_a.webp', 'circle_04_a.webp', 'circle_05_a.webp'],
      flare: 'flare_01_a.webp',
      muzzles: ['muzzle_01_a.webp', 'muzzle_02_a.webp', 'muzzle_03_a.webp', 'muzzle_04_a.webp', 'muzzle_05_a.webp'],
      sparks: ['spark_01_a.webp', 'spark_02_a.webp', 'spark_03_a.webp', 'spark_04_a.webp', 'spark_05_a.webp', 'spark_06_a.webp', 'spark_07_a.webp']
    },
    // Pool caps per quality preset (High, Medium, Low)
    POOLS: {
      HIGH: { impactSlots: 16, explosionSlots: 6, muzzleSlots: 6, fireSlots: 8, enableStaticLayers: true },
      MEDIUM: { impactSlots: 10, explosionSlots: 4, muzzleSlots: 4, fireSlots: 4, enableStaticLayers: true },
      LOW: { impactSlots: 6, explosionSlots: 2, muzzleSlots: 2, fireSlots: 2, enableStaticLayers: false },
    },
    DEFAULT_SIZES: {
      IMPACT_SMOKE: 0.8,
      EXPLOSION: 3.2,
      MUZZLE: 0.5,
      FIRE: 1.2,
    }
  }
} as const;
