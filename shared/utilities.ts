export const GRENADE_BASE_COOLDOWN = 30; // 30s base cooldown
export const GRENADE_MAX_CHARGES = 2; // 2 charges
export const GRENADE_DAMAGE = 80; // 80 damage
export const GRENADE_RADIUS = 4; // 4-unit radius
export const GRENADE_FUSE_TIME = 2.0; // PLACEHOLDER - not specified in GAMEPLAY.md, needs playtesting

export const FLASHBANG_BASE_COOLDOWN = 25; // 25s base cooldown
export const FLASHBANG_MAX_CHARGES = 2; // 2 charges
export const FLASHBANG_RADIUS = 8; // PLACEHOLDER - not specified in GAMEPLAY.md, needs playtesting
export const FLASHBANG_DURATION = 3.5; // PLACEHOLDER - not specified in GAMEPLAY.md, needs playtesting

export const MEDKIT_BASE_COOLDOWN = 45; // 45s base cooldown (GAMEMODE_CONFIG.md)
export const MEDKIT_MAX_CHARGES = 1; // 1 charge per life
export const MEDKIT_HEAL_AMOUNT = 50; // PLACEHOLDER - not specified in GAMEPLAY.md, needs playtesting
export const MEDKIT_TARGET_RADIUS = 5.0; // PLACEHOLDER - not specified in GAMEPLAY.md, needs playtesting

export const REVIVE_BASE_COOLDOWN = 60; // 60s base cooldown
export const REVIVE_MAX_CHARGES = 1; // 1 charge per life
export const REVIVE_CHANNEL_DURATION = 2.0; // PLACEHOLDER - not specified in GAMEPLAY.md, needs playtesting
export const REVIVE_HEALTH_RESTORED = 50; // PLACEHOLDER - not specified in GAMEPLAY.md, needs playtesting
export const REVIVE_TARGET_RADIUS = 5.0; // PLACEHOLDER - not specified in GAMEPLAY.md, needs playtesting

export const RADIO_BASE_COOLDOWN = 15; // 15s base cooldown
export const RADIO_MAX_CHARGES = 999; // Unlimited charges

export const SIGNAL_JAMMER_BASE_COOLDOWN = 90; // 90s base cooldown
export const SIGNAL_JAMMER_MAX_CHARGES = 1; // 1 charge per life
export const SIGNAL_JAMMER_DURATION = 10.0; // 10s duration jamming camera reporting & sensors
export const SIGNAL_JAMMER_RADIUS = 15.0; // 15m camera disable radius

export const PROXIMITY_MINE_BASE_COOLDOWN = 120; // 120s base cooldown
export const PROXIMITY_MINE_MAX_CHARGES = 1; // 1 charge per life
export const PROXIMITY_MINE_DAMAGE = 100; // 100 damage on blast
export const PROXIMITY_MINE_RADIUS = 4.0; // 4.0m blast radius
export const PROXIMITY_MINE_TRIGGER_RADIUS = 4.0; // 4.0m trigger radius

export const C4_BASE_COOLDOWN = 120; // 120s base cooldown
export const C4_MAX_CHARGES = 1; // 1 charge per life
export const C4_DAMAGE = 150; // PLACEHOLDER - high damage, not specified in GAMEPLAY.md, needs playtesting
export const C4_RADIUS = 8.0; // PLACEHOLDER - area of effect, not specified in GAMEPLAY.md, needs playtesting

export type UtilityId =
  | 'Grenade'
  | 'Flashbang'
  | 'Med Kit'
  | 'Revive Tool'
  | 'Radio'
  | 'Signal Jammer'
  | 'Proximity Mine'
  | 'C4';

export interface UtilityDefinition {
  id: UtilityId;
  displayName: string;
  classId: string;
  slot: 'utility1' | 'utility2';
  baseCooldown: number;
  maxCharges: number;
  description: string;
}

export const UTILITIES: Record<UtilityId, UtilityDefinition> = {
  'Grenade': {
    id: 'Grenade',
    displayName: 'GRENADE',
    classId: 'ASSAULT',
    slot: 'utility1',
    baseCooldown: GRENADE_BASE_COOLDOWN,
    maxCharges: GRENADE_MAX_CHARGES,
    description: 'High-explosive fragmentation grenade. 80 damage, 4m blast radius.',
  },
  'Flashbang': {
    id: 'Flashbang',
    displayName: 'FLASHBANG',
    classId: 'ASSAULT',
    slot: 'utility2',
    baseCooldown: FLASHBANG_BASE_COOLDOWN,
    maxCharges: FLASHBANG_MAX_CHARGES,
    description: 'Non-lethal concussion grenade. Blinds and disorients targets.',
  },
  'Med Kit': {
    id: 'Med Kit',
    displayName: 'MED KIT',
    classId: 'MEDIC',
    slot: 'utility1',
    baseCooldown: MEDKIT_BASE_COOLDOWN,
    maxCharges: MEDKIT_MAX_CHARGES,
    description: 'Deploys medical supply to restore operative health.',
  },
  'Revive Tool': {
    id: 'Revive Tool',
    displayName: 'REVIVE TOOL',
    classId: 'MEDIC',
    slot: 'utility2',
    baseCooldown: REVIVE_BASE_COOLDOWN,
    maxCharges: REVIVE_MAX_CHARGES,
    description: 'Resuscitation unit for field emergency revival.',
  },
  'Radio': {
    id: 'Radio',
    displayName: 'RADIO',
    classId: 'RECON',
    slot: 'utility1',
    baseCooldown: RADIO_BASE_COOLDOWN,
    maxCharges: RADIO_MAX_CHARGES,
    description: "Intercepts fragments of the LLM commander's last operational cycle. Surfaces as an operational summary.",
  },
  'Signal Jammer': {
    id: 'Signal Jammer',
    displayName: 'SIGNAL JAMMER',
    classId: 'RECON',
    slot: 'utility2',
    baseCooldown: SIGNAL_JAMMER_BASE_COOLDOWN,
    maxCharges: SIGNAL_JAMMER_MAX_CHARGES,
    description: 'Jams local drone sensors and camera reporting in zone.',
  },
  'Proximity Mine': {
    id: 'Proximity Mine',
    displayName: 'PROXIMITY MINE',
    classId: 'DEMOLITIONS',
    slot: 'utility1',
    baseCooldown: PROXIMITY_MINE_BASE_COOLDOWN,
    maxCharges: PROXIMITY_MINE_MAX_CHARGES,
    description: 'Deploys explosive mine triggered by enemy proximity.',
  },
  'C4': {
    id: 'C4',
    displayName: 'C4',
    classId: 'DEMOLITIONS',
    slot: 'utility2',
    baseCooldown: C4_BASE_COOLDOWN,
    maxCharges: C4_MAX_CHARGES,
    description: 'Remote-detonated explosive charge.',
  },
};

export const UTILITY_MODEL_KEYS: Record<UtilityId, string> = {
  'Grenade': 'm67-grenade-optimized.glb',
  'Flashbang': 'm84-flashbang-optimized.glb',
  'Med Kit': 'emergency-medkit-optimized.glb',
  'Revive Tool': 'healthshot-optimized.glb',
  'Radio': 'selex-prr-optimized.glb',
  'Signal Jammer': 'prc152-optimized.glb',
  'Proximity Mine': 'proximity-mine-optimized.glb',
  'C4': 'c4-optimized.glb',
};

export interface SlotUtilityState {
  id: UtilityId;
  charges: number;
  maxCharges: number;
  cooldownRemaining: number; // in seconds
  baseCooldown: number; // in seconds
}

export interface PlayerUtilityState {
  utility1: SlotUtilityState;
  utility2: SlotUtilityState;
}

export function createInitialUtilityState(classId: string, cooldownMultiplier: number = 1.0): PlayerUtilityState {
  let u1Id: UtilityId = 'Grenade';
  let u2Id: UtilityId = 'Flashbang';

  if (classId === 'MEDIC') {
    u1Id = 'Med Kit';
    u2Id = 'Revive Tool';
  } else if (classId === 'RECON') {
    u1Id = 'Radio';
    u2Id = 'Signal Jammer';
  } else if (classId === 'DEMOLITIONS') {
    u1Id = 'C4';
    u2Id = 'Proximity Mine';
  }

  const u1Def = UTILITIES[u1Id];
  const u2Def = UTILITIES[u2Id];

  return {
    utility1: {
      id: u1Id,
      charges: u1Def.maxCharges,
      maxCharges: u1Def.maxCharges,
      cooldownRemaining: 0,
      baseCooldown: u1Def.baseCooldown * cooldownMultiplier,
    },
    utility2: {
      id: u2Id,
      charges: u2Def.maxCharges,
      maxCharges: u2Def.maxCharges,
      cooldownRemaining: 0,
      baseCooldown: u2Def.baseCooldown * cooldownMultiplier,
    },
  };
}
