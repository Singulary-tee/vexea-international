// Zero-GC, highly optimized AABB collision library
export interface AABB {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
}

export class CollisionSystem {
  public boxes: AABB[] = [];
  private grid: Map<number, number[]> = new Map();
  private readonly CELL_SIZE = 50;

  private getGridKey(cx: number, cz: number): number {
    return (cx + 100000) * 200000 + (cz + 100000);
  }

  public loadFromSpec(specJson: any) {
    this.boxes = [];
    this.grid.clear();

    if (specJson && Array.isArray(specJson.buildings)) {
      for (let i = 0; i < specJson.buildings.length; i++) {
        const b = specJson.buildings[i];
        if (b && b.position && b.size) {
          const angleRad = b.rotation && b.rotation.y ? (b.rotation.y * Math.PI) / 180 : 0;
          let sizeX = b.size.x || 10;
          let sizeZ = b.size.z || 10;
          if (Math.abs(Math.sin(angleRad)) > 0.707) {
            const temp = sizeX;
            sizeX = sizeZ;
            sizeZ = temp;
          }
          const halfX = sizeX / 2;
          const halfY = (b.size.y || 10) / 2;
          const halfZ = sizeZ / 2;

          const box: AABB = {
            xMin: b.position.x - halfX,
            xMax: b.position.x + halfX,
            yMin: b.position.y,
            yMax: b.position.y + (b.size.y || 10),
            zMin: b.position.z - halfZ,
            zMax: b.position.z + halfZ,
          };

          const boxIndex = this.boxes.length;
          this.boxes.push(box);

          const minCx = Math.floor(box.xMin / this.CELL_SIZE);
          const maxCx = Math.floor(box.xMax / this.CELL_SIZE);
          const minCz = Math.floor(box.zMin / this.CELL_SIZE);
          const maxCz = Math.floor(box.zMax / this.CELL_SIZE);

          for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cz = minCz; cz <= maxCz; cz++) {
              const key = this.getGridKey(cx, cz);
              let cell = this.grid.get(key);
              if (!cell) {
                cell = [];
                this.grid.set(key, cell);
              }
              cell.push(boxIndex);
            }
          }
        }
      }
    }
  }

  // Hitscan raycast vs AABB logic (Drones/Players/Walls) using Spatial Hash Grid
  public rayIntersectsAny(origin: {x: number, y: number, z: number}, dir: {x: number, y: number, z: number}, maxDistance: number): boolean {
    if (this.boxes.length === 0) return false;

    let cx = Math.floor(origin.x / this.CELL_SIZE);
    let cz = Math.floor(origin.z / this.CELL_SIZE);

    const stepX = dir.x > 0 ? 1 : (dir.x < 0 ? -1 : 0);
    const stepZ = dir.z > 0 ? 1 : (dir.z < 0 ? -1 : 0);

    const tDeltaX = dir.x !== 0 ? Math.abs(this.CELL_SIZE / dir.x) : Infinity;
    const tDeltaZ = dir.z !== 0 ? Math.abs(this.CELL_SIZE / dir.z) : Infinity;

    let tMaxX = dir.x > 0 ? ((cx + 1) * this.CELL_SIZE - origin.x) / dir.x : (dir.x < 0 ? (cx * this.CELL_SIZE - origin.x) / dir.x : Infinity);
    let tMaxZ = dir.z > 0 ? ((cz + 1) * this.CELL_SIZE - origin.z) / dir.z : (dir.z < 0 ? (cz * this.CELL_SIZE - origin.z) / dir.z : Infinity);

    let t = 0;

    while (t <= maxDistance) {
      const key = this.getGridKey(cx, cz);
      const cell = this.grid.get(key);

      if (cell) {
        for (let i = 0; i < cell.length; i++) {
          const boxIndex = cell[i];
          if (this.rayIntersectsAABB(origin, dir, this.boxes[boxIndex], maxDistance)) {
            return true;
          }
        }
      }

      if (tMaxX < tMaxZ) {
        t = tMaxX;
        if (t > maxDistance) break;
        cx += stepX;
        tMaxX += tDeltaX;
      } else {
        t = tMaxZ;
        if (t > maxDistance) break;
        cz += stepZ;
        tMaxZ += tDeltaZ;
      }
    }

    return false;
  }

  public rayIntersectsAABB(origin: {x: number, y: number, z: number}, dir: {x: number, y: number, z: number}, box: AABB, maxDistance: number): boolean {
    const oodX = dir.x !== 0 ? 1.0 / dir.x : 0;
    const oodY = dir.y !== 0 ? 1.0 / dir.y : 0;
    const oodZ = dir.z !== 0 ? 1.0 / dir.z : 0;

    let tmin = 0.0;
    let tmax = maxDistance;

    // X
    if (Math.abs(dir.x) < 1e-6) {
      if (origin.x < box.xMin || origin.x > box.xMax) return false;
    } else {
      let t1 = (box.xMin - origin.x) * oodX;
      let t2 = (box.xMax - origin.x) * oodX;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    // Y
    if (Math.abs(dir.y) < 1e-6) {
      if (origin.y < box.yMin || origin.y > box.yMax) return false;
    } else {
      let t1 = (box.yMin - origin.y) * oodY;
      let t2 = (box.yMax - origin.y) * oodY;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    // Z
    if (Math.abs(dir.z) < 1e-6) {
      if (origin.z < box.zMin || origin.z > box.zMax) return false;
    } else {
      let t1 = (box.zMin - origin.z) * oodZ;
      let t2 = (box.zMax - origin.z) * oodZ;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    return true;
  }
}

export const globalCollisionSystem = new CollisionSystem();
