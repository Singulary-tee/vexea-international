import { describe, expect, it } from 'vitest';
import { CLASSES, getClassWeaponId, isClassWeaponAllowed } from '../shared/classes';
import { isRuntimeWeaponId } from '../shared/constants';
import { AUTHORING_REQUIRED_WEAPON_IDS } from '../shared/weapons';
import { UTILITY_MODEL_KEYS, UTILITIES, createInitialUtilityState } from '../shared/utilities';
import { UTILITY_ASSET_DETAILS, WEAPON_ASSET_DETAILS } from '../shared/asset-details';

describe('semantic weapon slot contract', () => {
  it('keeps class primary pools and rifle defaults aligned', () => {
    expect(CLASSES.ASSAULT.primaryWeaponOptions).toEqual(['rifle', 'smg']);
    expect(CLASSES.MEDIC.primaryWeaponOptions).toEqual(['rifle', 'shotgun']);
    expect(CLASSES.RECON.primaryWeaponOptions).toEqual(['rifle', 'sniper']);
    expect(CLASSES.DEMOLITIONS.primaryWeaponOptions).toEqual(['rifle', 'lmg']);

    for (const classId of Object.keys(CLASSES) as Array<keyof typeof CLASSES>) {
      expect(getClassWeaponId(classId, 'primary')).toBe('rifle');
      expect(getClassWeaponId(classId, 'secondary')).toBe('pistol');
      expect(CLASSES[classId].secondaryWeaponOptions).toEqual(['pistol']);
    }
  });

  it('rejects weapons outside a class primary pool and accepts pistol secondaries', () => {
    expect(isClassWeaponAllowed('MEDIC', 'primary', 'shotgun')).toBe(true);
    expect(isClassWeaponAllowed('MEDIC', 'primary', 'sniper')).toBe(false);
    expect(isClassWeaponAllowed('RECON', 'primary', 'sniper')).toBe(true);
    expect(isClassWeaponAllowed('ASSAULT', 'secondary', 'pistol')).toBe(true);
    expect(isClassWeaponAllowed('ASSAULT', 'secondary', 'shotgun')).toBe(false);
  });
});

describe('named utility and asset connector contract', () => {
  it('keeps each class utility pair in named slot order', () => {
    expect([CLASSES.ASSAULT.utility1, CLASSES.ASSAULT.utility2]).toEqual(['Grenade', 'Flashbang']);
    expect([CLASSES.MEDIC.utility1, CLASSES.MEDIC.utility2]).toEqual(['Med Kit', 'Revive Tool']);
    expect([CLASSES.RECON.utility1, CLASSES.RECON.utility2]).toEqual(['Radio', 'Signal Jammer']);
    expect([CLASSES.DEMOLITIONS.utility1, CLASSES.DEMOLITIONS.utility2]).toEqual(['C4', 'Proximity Mine']);

    const demoState = createInitialUtilityState('DEMOLITIONS');
    expect(demoState.utility1.id).toBe('C4');
    expect(demoState.utility2.id).toBe('Proximity Mine');
  });

  it('binds every utility identity to a model and all weapon identities to asset details', () => {
    for (const utilityId of Object.keys(UTILITIES) as Array<keyof typeof UTILITIES>) {
      expect(UTILITY_MODEL_KEYS[utilityId]).toBe(UTILITY_ASSET_DETAILS[utilityId].modelKey);
      expect(UTILITY_ASSET_DETAILS[utilityId].animationUseKey).toContain('PLACEHOLDER');
    }

    for (const weaponId of Object.keys(WEAPON_ASSET_DETAILS)) {
      expect(WEAPON_ASSET_DETAILS[weaponId as keyof typeof WEAPON_ASSET_DETAILS].modelKey).toMatch(/\.glb$/);
    }
  });

  it('keeps un-authored identities explicit instead of silently treating them as runtime-ready', () => {
    expect(AUTHORING_REQUIRED_WEAPON_IDS).toEqual(['smg']);
    expect(isRuntimeWeaponId('rifle')).toBe(true);
    expect(isRuntimeWeaponId('pistol')).toBe(true);
    expect(isRuntimeWeaponId('smg')).toBe(false);
    expect(WEAPON_ASSET_DETAILS.smg.authored).toBe(false);
  });
});
