import { describe, it, expect } from 'vitest';
import { ZoneRegistry } from '../server/map/ZoneRegistry';

describe('ZoneRegistry Tests', () => {
  it('should detect restricted gates correctly', () => {
    const registry = new ZoneRegistry();
    registry.loadFromSpec({
      restrictedGates: [
        {
          position: { x: 100, y: 0, z: 100 },
          killZoneRadius: 20
        }
      ]
    });

    expect(registry.isInRestrictedGate(100, 100)).toBe(true);
    expect(registry.isInRestrictedGate(110, 110)).toBe(true); // Distance ~14.1 < 20
    expect(registry.isInRestrictedGate(120, 120)).toBe(false); // Distance ~28.2 > 20
  });

  it('should handle missing spec or data gracefully', () => {
    const registry = new ZoneRegistry();
    registry.loadFromSpec(null);
    expect(registry.isInRestrictedGate(0, 0)).toBe(false);
  });
});
