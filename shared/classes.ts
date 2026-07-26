export type ClassId = 'ASSAULT' | 'MEDIC' | 'RECON' | 'DEMOLITIONS';

export interface ClassDefinition {
  id: ClassId;
  displayName: string;
  role: string;
  primaryWeapon: string;
  secondaryWeapon: string;
  utility1: string;
  utility2: string;
}

export const CLASSES: Record<ClassId, ClassDefinition> = {
  ASSAULT: {
    id: 'ASSAULT',
    displayName: 'ASSAULT',
    role: 'Baseline combat. Highest damage output.',
    primaryWeapon: 'Rifle',
    secondaryWeapon: 'Pistol',
    utility1: 'Grenade',
    utility2: 'Flashbang',
  },
  MEDIC: {
    id: 'MEDIC',
    displayName: 'MEDIC',
    role: 'Team sustain. Critical in attrition matches.',
    primaryWeapon: 'Rifle',
    secondaryWeapon: 'Pistol',
    utility1: 'Med Kit',
    utility2: 'Revive Tool',
  },
  RECON: {
    id: 'RECON',
    displayName: 'RECON',
    role: 'Intelligence and disruption. Directly counters the LLM commander\'s awareness layer.',
    primaryWeapon: 'Rifle',
    secondaryWeapon: 'Pistol',
    utility1: 'Radio',
    utility2: 'Signal Disruptor',
  },
  DEMOLITIONS: {
    id: 'DEMOLITIONS',
    displayName: 'DEMOLITIONS',
    role: 'Zone control and infrastructure destruction.',
    primaryWeapon: 'Rifle',
    secondaryWeapon: 'Pistol',
    utility1: 'EMP',
    utility2: 'C4',
  },
};
