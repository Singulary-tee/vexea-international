import { DroneType, DRONE_CONFIGS, PLAYER_RADIUS, PLAYER_TOTAL_HEIGHT } from "./constants";

export interface CollisionEntity {
  x: number;
  y: number;
  z: number;
  radius: number;
  halfHeight: number;
  mass: number;
}

/**
 * Returns [radius, halfHeight, mass] for a drone type based on DRONE_CONFIGS.
 * Light air drones have small mass (0.2), medium ground drones (1.0), heavy (3.0).
 */
export function getDroneCollisionDimensions(type: DroneType): { radius: number; halfHeight: number; mass: number } {
  const conf = DRONE_CONFIGS[type];
  if (!conf) {
    return { radius: 0.5, halfHeight: 0.4, mass: 1.0 };
  }

  if (conf.collider.type === "cuboid" && conf.collider.halfExtents) {
    const hx = conf.collider.halfExtents[0];
    const hy = conf.collider.halfExtents[1];
    const hz = conf.collider.halfExtents[2];
    const rad = Math.max(hx, hz);
    const mass = conf.isAirUnit ? 0.3 : (type === DroneType.WHEELED ? 2.5 : 1.0);
    return { radius: rad, halfHeight: hy, mass };
  }

  if (conf.collider.type === "capsule" && conf.collider.halfHeight !== undefined && conf.collider.radius !== undefined) {
    const rad = conf.collider.radius;
    const hy = conf.collider.halfHeight + rad;
    return { radius: rad, halfHeight: hy, mass: 1.5 };
  }

  const rad = conf.collider.radius || 0.6;
  const mass = conf.isAirUnit ? 0.3 : 1.0;
  return { radius: rad, halfHeight: 0.4, mass };
}

export const PLAYER_COLLISION_RADIUS = PLAYER_RADIUS; // 0.4m
export const PLAYER_COLLISION_HALF_HEIGHT = PLAYER_TOTAL_HEIGHT * 0.5; // 0.9m
export const PLAYER_MASS = 1.0;

// Reusable scratch vars for Zero-GC
let _dx = 0;
let _dz = 0;
let _distSq = 0;
let _dist = 0;
let _minDist = 0;
let _overlap = 0;
let _nx = 0;
let _nz = 0;
let _dy = 0;
let _totalMass = 0;
let _ratio1 = 0;
let _ratio2 = 0;

/**
 * Resolves horizontal cylinder-to-cylinder separation between two 3D positions in place.
 * Returns true if a collision occurred and was separated.
 */
export function resolveCylinderSeparation(
  pos1: { x: number; y: number; z: number },
  radius1: number,
  halfHeight1: number,
  mass1: number,
  pos2: { x: number; y: number; z: number },
  radius2: number,
  halfHeight2: number,
  mass2: number,
  immovable2: boolean = false
): boolean {
  _dy = Math.abs(pos1.y - pos2.y);
  if (_dy >= (halfHeight1 + halfHeight2)) {
    return false;
  }

  _dx = pos1.x - pos2.x;
  _dz = pos1.z - pos2.z;
  _distSq = _dx * _dx + _dz * _dz;
  _minDist = radius1 + radius2;

  if (_distSq >= _minDist * _minDist) {
    return false;
  }

  if (_distSq < 0.000001) {
    _dx = 0.001;
    _dz = 0;
    _dist = 0.001;
  } else {
    _dist = Math.sqrt(_distSq);
  }

  _overlap = _minDist - _dist;
  _nx = _dx / _dist;
  _nz = _dz / _dist;

  if (immovable2) {
    pos1.x += _nx * _overlap;
    pos1.z += _nz * _overlap;
    return true;
  }

  _totalMass = mass1 + mass2;
  if (_totalMass <= 0) _totalMass = 2.0;

  // Heavier entity is pushed less, lighter entity pushed more
  _ratio1 = mass2 / _totalMass;
  _ratio2 = mass1 / _totalMass;

  pos1.x += _nx * _overlap * _ratio1;
  pos1.z += _nz * _overlap * _ratio1;
  pos2.x -= _nx * _overlap * _ratio2;
  pos2.z -= _nz * _overlap * _ratio2;

  return true;
}

/**
 * Softly resolves separation of a primary position against an immovable cylinder (e.g. client post-prediction).
 */
export function resolvePointAgainstCylinder(
  point: { x: number; y: number; z: number },
  pointRadius: number,
  pointHalfHeight: number,
  obstaclePos: { x: number; y: number; z: number },
  obstacleRadius: number,
  obstacleHalfHeight: number
): boolean {
  _dy = Math.abs(point.y - obstaclePos.y);
  if (_dy >= (pointHalfHeight + obstacleHalfHeight)) {
    return false;
  }

  _dx = point.x - obstaclePos.x;
  _dz = point.z - obstaclePos.z;
  _distSq = _dx * _dx + _dz * _dz;
  _minDist = pointRadius + obstacleRadius;

  if (_distSq >= _minDist * _minDist) {
    return false;
  }

  if (_distSq < 0.000001) {
    _dx = 0.001;
    _dz = 0;
    _dist = 0.001;
  } else {
    _dist = Math.sqrt(_distSq);
  }

  _overlap = _minDist - _dist;
  _nx = _dx / _dist;
  _nz = _dz / _dist;

  point.x += _nx * _overlap;
  point.z += _nz * _overlap;
  return true;
}
