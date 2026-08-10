import { describe, it, expect } from 'vitest';
import { PLAYER_MAX_HP, DRONE_CONFIGS, ZONES, getDroneMuzzleWorldPosition, getDroneLightWorldPositions, DroneType } from '../shared/constants';
import { CLASSES } from '../shared/classes';
import { GAMEMODES, ACTIVE_GAMEMODE } from '../shared/gamemode-configs';
import { ASSET_STRUCTURE } from '../shared/asset-structure';
import { DEFAULT_FEATURE_FLAGS, getFeatureFlagScope, FeatureFlagKey, FeatureFlagScope } from '../shared/feature-flags';
import { TRANSPORT_MODE } from '../shared/transport.config';
import { MAP_REGISTRY, getDefaultMap, getDevMap, getMapById } from '../shared/maps/map-registry';
import { calculateDamageWithFalloff } from '../shared/weapons';

describe('Shared Data Consistency Tests', () => {
  it('should have a valid active gamemode', () => {
    expect(ACTIVE_GAMEMODE).toBeDefined();
    expect(ACTIVE_GAMEMODE.id).toBe('STANDARD');
    expect(GAMEMODES[ACTIVE_GAMEMODE.id]).toBeDefined();
  });
  it('should handle map registry helpers correctly', () => {
    expect(getDefaultMap().id).toBe('map_1_facility');
    expect(getDevMap().id).toBe('map_0_dev');
    expect(getMapById('map_1_facility')).toBeDefined();
    expect(getMapById('invalid')).toBeUndefined();
  });
  it('should calculate drone muzzle world position correctly', () => {
    const drone = {
      posX: 10, posY: 5, posZ: 10,
      rotX: 0, rotY: 0, rotZ: 0, rotW: 1,
      type: DroneType.HUMANOID
    };
    const pos = getDroneMuzzleWorldPosition(drone);
    expect(pos).toBeDefined();
    expect(pos.x).toBeCloseTo(10.2);
    expect(pos.y).toBeGreaterThan(5); 
  });

  it('should calculate wheeled drone muzzle position with turret articulated target', () => {
    const drone = {
      posX: 0, posY: 0, posZ: 0,
      rotX: 0, rotY: 0, rotZ: 0, rotW: 1,
      type: DroneType.WHEELED
    };
    const target = { x: 0, y: 0, z: 10 };
    const pos = getDroneMuzzleWorldPosition(drone, target);
    expect(pos).toBeDefined();
    expect(typeof pos.x).toBe('number');
    expect(typeof pos.y).toBe('number');
    expect(typeof pos.z).toBe('number');
  });

  it('should apply orientationOffset to drone muzzle and light points correctly', () => {
    const dog = {
      posX: 0, posY: 0, posZ: 0,
      rotX: 0, rotY: 0, rotZ: 0, rotW: 1,
      type: DroneType.ROBOT_DOG
    };
    const muzzlePos = getDroneMuzzleWorldPosition(dog);
    expect(muzzlePos).toBeDefined();
    
    const lightPositions = getDroneLightWorldPositions(dog);
    expect(lightPositions.length).toBe(2);
    expect(lightPositions[0]).toBeDefined();
    expect(lightPositions[1]).toBeDefined();
  });

  it('should have visualScaleTarget defined for Humanoid in DRONE_CONFIGS', () => {
    const humanoidConfig = DRONE_CONFIGS[DroneType.HUMANOID];
    expect(humanoidConfig.visualScaleTarget).toBeCloseTo(0.72);
  });
  it('should calculate damage falloff correctly', () => {
    const falloff = { maxDamageRange: 10, minDamageRange: 20, minDamage: 5 };
    expect(calculateDamageWithFalloff(100, 5, falloff)).toBe(100);
    expect(calculateDamageWithFalloff(100, 25, falloff)).toBe(5);
    expect(calculateDamageWithFalloff(100, 15, falloff)).toBe(52.5); // (100+5)/2 = 52.5? No. 100 - (100-5)*0.5 = 100 - 47.5 = 52.5. Correct.
  });
  it('should have valid gameplay constants', () => {
    expect(PLAYER_MAX_HP).toBeGreaterThan(0);
    expect(ZONES.SPAWN).toBeDefined();
  });

  it('should have valid drone configurations', () => {
    expect(DRONE_CONFIGS[0]).toBeDefined(); // ROTARY_SHOOTER is 0
  });

  it('should have valid player classes', () => {
    expect(CLASSES.ASSAULT).toBeDefined();
    expect(CLASSES.MEDIC).toBeDefined();
    expect(CLASSES.RECON).toBeDefined();
    expect(CLASSES.DEMOLITIONS).toBeDefined();
  });

  it('should have valid game modes', () => {
    expect(GAMEMODES.STANDARD).toBeDefined();
  });

  it('should have valid asset structures', () => {
    expect(ASSET_STRUCTURE).toBeDefined();
  });

  it('should have valid feature flags', () => {
    expect(DEFAULT_FEATURE_FLAGS).toBeDefined();
    expect(getFeatureFlagScope(FeatureFlagKey.SENTRY_CLIENT_ENABLED)).toBe(FeatureFlagScope.CLIENT);
    expect(getFeatureFlagScope(FeatureFlagKey.SENTRY_SERVER_ENABLED)).toBe(FeatureFlagScope.SERVER);
    expect(getFeatureFlagScope(FeatureFlagKey.BP_SEASON_ID)).toBe(FeatureFlagScope.SHARED);
  });

  it('should have valid transport configuration', () => {
    expect(TRANSPORT_MODE).toBeDefined();
  });

  it('should have valid map registry', () => {
    expect(MAP_REGISTRY).toBeDefined();
  });
});
