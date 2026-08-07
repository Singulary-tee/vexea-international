import { ZONE_BOUNDS, ZoneName, ZONES } from "../../shared/constants";

export interface ZoneBoundary {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface RestrictedGateSpec {
  id?: string;
  position: { x: number; z: number };
  killZoneRadius?: number;
}

/**
 * ZoneRegistry
 * Modular spatial boundary and restricted gate validation manager.
 */
export class ZoneRegistry {
  private restrictedGates: RestrictedGateSpec[] = [];
  private zoneBoundsMap: Map<string, ZoneBoundary> = new Map();

  constructor() {
    this.initDefaultZoneBounds();
  }

  private initDefaultZoneBounds(): void {
    for (const [zoneKey, bounds] of Object.entries(ZONE_BOUNDS)) {
      this.zoneBoundsMap.set(zoneKey, {
        id: zoneKey,
        minX: bounds.center.x - bounds.halfSize.x,
        maxX: bounds.center.x + bounds.halfSize.x,
        minZ: bounds.center.z - bounds.halfSize.z,
        maxZ: bounds.center.z + bounds.halfSize.z,
      });
    }
  }

  public loadFromSpec(specJson: any): void {
    if (specJson && Array.isArray(specJson.restrictedGates)) {
      this.restrictedGates = specJson.restrictedGates;
    }
    if (specJson && Array.isArray(specJson.zones)) {
      for (const zoneSpec of specJson.zones) {
        if (zoneSpec && zoneSpec.id && zoneSpec.bounds) {
          this.zoneBoundsMap.set(zoneSpec.id, {
            id: zoneSpec.id,
            minX: zoneSpec.bounds.minX,
            maxX: zoneSpec.bounds.maxX,
            minZ: zoneSpec.bounds.minZ,
            maxZ: zoneSpec.bounds.maxZ,
          });
        }
      }
    }
  }

  public isPositionInZone(zoneId: string, x: number, z: number): boolean {
    const bound = this.zoneBoundsMap.get(zoneId);
    if (!bound) return false;
    return x >= bound.minX && x <= bound.maxX && z >= bound.minZ && z <= bound.maxZ;
  }

  public getZoneAtPosition(x: number, z: number): ZoneName | string | null {
    for (const [zoneId, bound] of this.zoneBoundsMap.entries()) {
      if (x >= bound.minX && x <= bound.maxX && z >= bound.minZ && z <= bound.maxZ) {
        return zoneId;
      }
    }
    return null;
  }

  public isInRestrictedGate(x: number, z: number): boolean {
    for (let i = 0; i < this.restrictedGates.length; i++) {
      const gate = this.restrictedGates[i];
      if (gate && gate.position) {
        const radius = typeof gate.killZoneRadius === 'number' ? gate.killZoneRadius : 15;
        const dx = x - gate.position.x;
        const dz = z - gate.position.z;
        if (dx * dx + dz * dz <= radius * radius) {
          return true;
        }
      }
    }
    return false;
  }
}
