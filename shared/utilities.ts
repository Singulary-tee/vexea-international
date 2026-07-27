export const GRENADE_BASE_COOLDOWN = 30; // 30s base cooldown
export const GRENADE_MAX_CHARGES = 2; // 2 charges
export const GRENADE_DAMAGE = 80; // 80 damage
export const GRENADE_RADIUS = 4; // 4-unit radius
export const GRENADE_FUSE_TIME = 2.0; // PLACEHOLDER - not specified in GAMEPLAY.md, needs playtesting

export const FLASHBANG_BASE_COOLDOWN = 25; // 25s base cooldown
export const FLASHBANG_MAX_CHARGES = 2; // 2 charges
export const FLASHBANG_RADIUS = 8; // PLACEHOLDER - not specified in GAMEPLAY.md, needs playtesting
export const FLASHBANG_DURATION = 3.5; // PLACEHOLDER - not specified in GAMEPLAY.md, needs playtesting

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
    baseCooldown: 20,
    maxCharges: 1,
    description: 'Deploys medical station to restore operative health.',
  },
  'Revive Tool': {
    id: 'Revive Tool',
    displayName: 'REVIVE TOOL',
    classId: 'MEDIC',
    slot: 'utility2',
    baseCooldown: 40,
    maxCharges: 1,
    description: 'Defibrillator unit for instant field resuscitation.',
  },
  'Radio': {
    id: 'Radio',
    displayName: 'RADIO',
    classId: 'RECON',
    slot: 'utility1',
    baseCooldown: 30,
    maxCharges: 1,
    description: 'Tactical comms array to pinpoint enemy positions.',
  },
  'Signal Disruptor': {
    id: 'Signal Disruptor',
    displayName: 'SIGNAL DISRUPTOR',
    classId: 'RECON',
    slot: 'utility2',
    baseCooldown: 45,
    maxCharges: 1,
    description: 'Jammer device to obscure team location from drone sensors.',
  },
  'EMP': {
    id: 'EMP',
    displayName: 'EMP',
    classId: 'DEMOLITIONS',
    slot: 'utility1',
    baseCooldown: 35,
    maxCharges: 1,
    description: 'Electromagnetic pulse device disabling nearby drone electronics.',
  },
  'C4': {
    id: 'C4',
    displayName: 'C4',
    classId: 'DEMOLITIONS',
    slot: 'utility2',
    baseCooldown: 50,
    maxCharges: 1,
    description: 'Remote-detonated high explosive charge.',
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
