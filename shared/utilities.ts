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

export const SIGNAL_DISRUPTOR_BASE_COOLDOWN = 90; // 90s base cooldown
export const SIGNAL_DISRUPTOR_MAX_CHARGES = 1; // 1 charge per life
export const SIGNAL_DISRUPTOR_DURATION = 10.0; // PLACEHOLDER - short duration, not specified in GAMEPLAY.md, needs playtesting

export const EMP_BASE_COOLDOWN = 60; // 60s base cooldown
export const EMP_MAX_CHARGES = 1; // 1 charge per life
export const EMP_RADIUS = 15.0; // PLACEHOLDER - not specified in GAMEPLAY.md, needs playtesting
export const EMP_DURATION = 12.0; // PLACEHOLDER - Duration TBD via playtesting (explicitly in GAMEPLAY.md)

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
  | 'Signal Disruptor'
  | 'EMP'
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
    description: 'Comms array to intercept operational LLM transmissions.',
  },
  'Signal Disruptor': {
    id: 'Signal Disruptor',
    displayName: 'SIGNAL DISRUPTOR',
    classId: 'RECON',
    slot: 'utility2',
    baseCooldown: SIGNAL_DISRUPTOR_BASE_COOLDOWN,
    maxCharges: SIGNAL_DISRUPTOR_MAX_CHARGES,
    description: 'Jammer device to degrade team location reporting to unknown state.',
  },
  'EMP': {
    id: 'EMP',
    displayName: 'EMP',
    classId: 'DEMOLITIONS',
    slot: 'utility1',
    baseCooldown: EMP_BASE_COOLDOWN,
    maxCharges: EMP_MAX_CHARGES,
    description: 'Electromagnetic pulse device disabling static cameras in radius.',
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
    u2Id = 'Signal Disruptor';
  } else if (classId === 'DEMOLITIONS') {
    u1Id = 'EMP';
    u2Id = 'C4';
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
