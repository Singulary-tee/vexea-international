import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClassLoadoutPersistence } from '../client/src/systems/ClassLoadoutPersistence';
import { CATALOG_LOADOUTS } from '../client/screens/armory-screen';

describe('ClassLoadoutPersistence Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default catalog loadout when no saved loadout exists', () => {
    const loadout = ClassLoadoutPersistence.getClassLoadout('ASSAULT');
    expect(loadout).toHaveLength(4);
    expect(loadout[0].id).toBe(CATALOG_LOADOUTS.ASSAULT[0].id);
  });

  it('should persist and retrieve custom loadouts via LocalStorage', async () => {
    const customItem = {
      id: 'custom_rifle',
      name: 'CUSTOM BATTLE RIFLE',
      weaponKey: 'rifle',
      category: 'Assault Rifle',
      slotName: 'PRIMARY',
      stats: { damage: 35 }
    };

    await ClassLoadoutPersistence.saveClassLoadout('ASSAULT', 0, customItem);

    const updated = ClassLoadoutPersistence.getClassLoadout('ASSAULT');
    expect(updated[0].id).toBe('custom_rifle');
    expect(updated[0].name).toBe('CUSTOM BATTLE RIFLE');
  });

  it('should persist full class loadout', async () => {
    const customList = [
      { id: 'item1', name: 'Rifle', weaponKey: 'rifle', category: 'Main', slotName: 'PRIMARY', stats: {} },
      { id: 'item2', name: 'Pistol', weaponKey: 'pistol', category: 'Side', slotName: 'SECONDARY', stats: {} },
      { id: 'item3', name: 'Grenade', weaponKey: 'grenade', category: 'Explosive', slotName: 'UTILITY 1', stats: {} },
      { id: 'item4', name: 'Smoke', weaponKey: 'grenade', category: 'Utility', slotName: 'UTILITY 2', stats: {} }
    ];

    await ClassLoadoutPersistence.saveFullClassLoadout('MEDIC', customList);

    const retrieved = ClassLoadoutPersistence.getClassLoadout('MEDIC');
    expect(retrieved).toHaveLength(4);
    expect(retrieved[0].id).toBe('item1');
    expect(retrieved[3].id).toBe('item4');
  });
});
