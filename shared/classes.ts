import type { WeaponId } from './weapons';

export type ClassId = 'ASSAULT' | 'MEDIC' | 'RECON' | 'DEMOLITIONS';

export interface ClassDefinition {
  id: ClassId;
  displayName: string;
  role: string;
  primaryWeapon: WeaponId;
  primaryWeaponOptions: readonly WeaponId[];
  secondaryWeapon: WeaponId;
  secondaryWeaponOptions: readonly WeaponId[];
  utility1: string;
  utility2: string;
}

export const CLASSES: Record<ClassId, ClassDefinition> = {
  ASSAULT: {
    id: 'ASSAULT',
    displayName: 'ASSAULT',
    role: 'Baseline combat. Highest damage output.',
    primaryWeapon: 'rifle',
    primaryWeaponOptions: ['rifle', 'smg'],
    secondaryWeapon: 'pistol',
    secondaryWeaponOptions: ['pistol'],
    utility1: 'Grenade',
    utility2: 'Flashbang',
  },
  MEDIC: {
    id: 'MEDIC',
    displayName: 'MEDIC',
    role: 'Team sustain. Critical in attrition matches.',
    primaryWeapon: 'rifle',
    primaryWeaponOptions: ['rifle', 'shotgun'],
    secondaryWeapon: 'pistol',
    secondaryWeaponOptions: ['pistol'],
    utility1: 'Med Kit',
    utility2: 'Revive Tool',
  },
  RECON: {
    id: 'RECON',
    displayName: 'RECON',
    role: 'Intelligence and disruption. Directly counters the LLM commander\'s awareness layer.',
    primaryWeapon: 'rifle',
    primaryWeaponOptions: ['rifle', 'sniper'],
    secondaryWeapon: 'pistol',
    secondaryWeaponOptions: ['pistol'],
    utility1: 'Radio',
    utility2: 'Signal Jammer',
  },
  DEMOLITIONS: {
    id: 'DEMOLITIONS',
    displayName: 'DEMOLITIONS',
    role: 'Zone control and trap deployment.',
    primaryWeapon: 'rifle',
    primaryWeaponOptions: ['rifle', 'lmg'],
    secondaryWeapon: 'pistol',
    secondaryWeaponOptions: ['pistol'],
    utility1: 'C4',
    utility2: 'Proximity Mine',
  },
};

export function getClassWeaponId(classId: ClassId, slot: 'primary' | 'secondary'): WeaponId {
  const classDef = CLASSES[classId] || CLASSES.ASSAULT;
  return slot === 'primary' ? classDef.primaryWeapon : classDef.secondaryWeapon;
}

export function isClassWeaponAllowed(classId: ClassId, slot: 'primary' | 'secondary', weaponId: string): weaponId is WeaponId {
  const classDef = CLASSES[classId] || CLASSES.ASSAULT;
  const allowed = slot === 'primary' ? classDef.primaryWeaponOptions : classDef.secondaryWeaponOptions;
  return allowed.includes(weaponId as WeaponId);
}
