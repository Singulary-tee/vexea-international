import { describe, it, expect } from 'vitest';
import { CollisionSystem } from '../shared/collision';

describe('CollisionSystem Tests', () => {
  it('should load boxes from spec correctly', () => {
    const sys = new CollisionSystem();
    sys.loadFromSpec({
      buildings: [
        {
          position: { x: 10, y: 0, z: 10 },
          size: { x: 4, y: 10, z: 4 },
          rotation: { y: 0 }
        }
      ]
    });

    expect(sys.boxes.length).toBe(1);
    expect(sys.boxes[0].xMin).toBe(8);
    expect(sys.boxes[0].xMax).toBe(12);
  });

  it('should detect ray intersections with AABB', () => {
    const sys = new CollisionSystem();
    const box = { xMin: 0, xMax: 2, yMin: 0, yMax: 2, zMin: 0, zMax: 2 };
    
    // Hit from the front
    expect(sys.rayIntersectsAABB({ x: 1, y: 1, z: -5 }, { x: 0, y: 0, z: 1 }, box, 10)).toBe(true);
    
    // Miss (too far)
    expect(sys.rayIntersectsAABB({ x: 1, y: 1, z: -5 }, { x: 0, y: 0, z: 1 }, box, 2)).toBe(false);
    
    // Miss (off axis)
    expect(sys.rayIntersectsAABB({ x: 5, y: 1, z: -5 }, { x: 0, y: 0, z: 1 }, box, 10)).toBe(false);
  });

  it('should handle rotated boxes in spec', () => {
    const sys = new CollisionSystem();
    sys.loadFromSpec({
      buildings: [
        {
          position: { x: 0, y: 0, z: 0 },
          size: { x: 10, y: 10, z: 2 },
          rotation: { y: 90 } // Should swap X and Z size
        }
      ]
    });

    expect(sys.boxes[0].xMax - sys.boxes[0].xMin).toBe(2);
    expect(sys.boxes[0].zMax - sys.boxes[0].zMin).toBe(10);
  });
});
