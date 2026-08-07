import { describe, it, expect } from 'vitest';
import { ZoneRegistry } from '../server/map/ZoneRegistry';
import { ZONES } from '../shared/constants';

describe('ZoneRegistry Spatial & Restricted Gate Tests', () => {
  it('should evaluate default spatial zone bounds accurately', () => {
    const registry = new ZoneRegistry();

    // Courtyard center is (144, 0, 496) with halfSize (144, 30, 144)
    expect(registry.isPositionInZone(ZONES.COURTYARD, 144, 496)).toBe(true);
    expect(registry.getZoneAtPosition(144, 496)).toBe(ZONES.COURTYARD);

    // Far away position (1000, 1000) is outside default zones
    expect(registry.getZoneAtPosition(1000, 1000)).toBeNull();
  });

  it('should evaluate restricted gates accurately', () => {
    const registry = new ZoneRegistry();
    registry.loadFromSpec({
      restrictedGates: [
        { id: 'gate_alpha', position: { x: 50, z: 50 }, killZoneRadius: 10 }
      ]
    });

    expect(registry.isInRestrictedGate(50, 50)).toBe(true);
    expect(registry.isInRestrictedGate(55, 50)).toBe(true);
    expect(registry.isInRestrictedGate(70, 70)).toBe(false);
  });
});
