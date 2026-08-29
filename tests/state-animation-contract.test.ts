import { describe, expect, it } from 'vitest';
import { DroneState, DroneType } from '../shared/constants';
import { ASSET_STRUCTURE } from '../shared/asset-structure';
import {
  PLAYER_ANIMATION_CONTRACT,
  DRONE_ANIMATION_CONTRACTS,
  resolvePlayerAnimationState,
  resolveDroneAnimationState,
  validateEntityAnimationContracts,
  PLAYER_AVAILABLE_CLIPS,
} from '../shared/state-animation-contract';

describe('Shared Entity Animation Contract System', () => {
  it('validates without errors across all entity types and states', () => {
    const result = validateEntityAnimationContracts();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  describe('Player Animation Contract', () => {
    it('has all declared clips matching the 24 authored actions in Player_one-optimized.glb', () => {
      const assetMeta = ASSET_STRUCTURE['Player_one-optimized.glb'];
      expect(assetMeta.animations).toHaveLength(24);
      const assetClipNames = assetMeta.animations.map((a) => a.name);

      expect(PLAYER_AVAILABLE_CLIPS).toHaveLength(24);
      for (const clipName of PLAYER_AVAILABLE_CLIPS) {
        expect(assetClipNames).toContain(clipName);
      }
    });

    it('defines prioritized mappings with explicit state classification and mutual exclusivity', () => {
      const states = PLAYER_ANIMATION_CONTRACT.states;
      expect(states.length).toBeGreaterThanOrEqual(8);

      const deadState = states.find((s) => s.state === 'DEAD');
      expect(deadState).toBeDefined();
      expect(deadState?.classification).toBe('TYPE_A');
      expect(deadState?.priority).toBe(100);
      expect(deadState?.mutuallyExclusiveWith).toContain('FIRING');
      expect(deadState?.mutuallyExclusiveWith).toContain('RELOADING');

      const firingState = states.find((s) => s.state === 'FIRING');
      expect(firingState?.priority).toBe(70);
      expect(firingState?.classification).toBe('TYPE_A');

      const idleState = states.find((s) => s.state === 'IDLE');
      expect(idleState?.priority).toBe(10);
      expect(idleState?.classification).toBe('TYPE_A');
    });

    it('resolves player animation state deterministically across priority hierarchy', () => {
      // Dead state takes highest priority
      const deadOutput = resolvePlayerAnimationState({
        isAlive: false,
        isFiring: true,
        isReloading: true,
        speed: 8.0,
      });
      expect(deadOutput.kind).toBe('clip');
      if (deadOutput.kind === 'clip') {
        expect(deadOutput.clipName).toBe('pistol_kneeling_idle');
        expect(deadOutput.loop).toBe(false);
      }

      // Reloading takes priority over firing and movement
      const reloadOutput = resolvePlayerAnimationState({
        isAlive: true,
        isReloading: true,
        isFiring: true,
        speed: 6.0,
        weapon: 'rifle',
      });
      expect(reloadOutput.kind).toBe('clip');
      if (reloadOutput.kind === 'clip') {
        expect(reloadOutput.clipName).toBe('rifle_aim_idle');
      }

      // Firing rifle
      const fireRifleOutput = resolvePlayerAnimationState({
        isAlive: true,
        isFiring: true,
        weapon: 'rifle',
      });
      expect(fireRifleOutput.kind).toBe('clip');
      if (fireRifleOutput.kind === 'clip') {
        expect(fireRifleOutput.clipName).toBe('rifle_fire');
      }

      // Sprinting
      const sprintOutput = resolvePlayerAnimationState({
        isAlive: true,
        isSprinting: true,
        speed: 7.0,
        weapon: 'rifle',
      });
      expect(sprintOutput.kind).toBe('clip');
      if (sprintOutput.kind === 'clip') {
        expect(sprintOutput.clipName).toBe('rifle_run');
      }

      // Crouching
      const crouchOutput = resolvePlayerAnimationState({
        isAlive: true,
        isCrouching: true,
        speed: 0,
      });
      expect(crouchOutput.kind).toBe('clip');
      if (crouchOutput.kind === 'clip') {
        expect(crouchOutput.clipName).toBe('pistol_kneeling_idle');
      }

      // Jumping
      const jumpOutput = resolvePlayerAnimationState({
        isAlive: true,
        isGrounded: false,
      });
      expect(jumpOutput.kind).toBe('clip');
      if (jumpOutput.kind === 'clip') {
        expect(jumpOutput.clipName).toBe('pistol_jump');
      }

      // Default idle
      const idleOutput = resolvePlayerAnimationState({
        isAlive: true,
        weapon: 'rifle',
      });
      expect(idleOutput.kind).toBe('clip');
      if (idleOutput.kind === 'clip') {
        expect(idleOutput.clipName).toBe('rifle_idle');
      }
    });
  });

  describe('Drone Animation Contracts', () => {
    const requiredStates: DroneState[] = [
      DroneState.IDLE,
      DroneState.PATROLLING,
      DroneState.PURSUING,
      DroneState.ATTACKING,
      DroneState.REPOSITIONING,
      DroneState.DEAD,
    ];

    const droneTypes: DroneType[] = [
      DroneType.ROTARY_SHOOTER,
      DroneType.BOMBER,
      DroneType.RECON,
      DroneType.FIXED_WING,
      DroneType.WHEELED,
      DroneType.ROBOT_DOG,
      DroneType.HUMANOID,
      DroneType.TEST_ENTITY,
    ];

    it('covers all DroneTypes with complete state mappings', () => {
      for (const type of droneTypes) {
        const contract = DRONE_ANIMATION_CONTRACTS[type];
        expect(contract).toBeDefined();
        expect(contract.states.length).toBe(6);

        for (const state of requiredStates) {
          const resolved = resolveDroneAnimationState(type, state);
          expect(resolved).toBeDefined();
          expect(['clip', 'ikTarget', 'procedural', 'static']).toContain(resolved.kind);
        }
      }
    });

    it('resolves quadruped Robot Dog walking clip on pursue/patrol', () => {
      const dogPursue = resolveDroneAnimationState(DroneType.ROBOT_DOG, DroneState.PURSUING);
      expect(dogPursue.kind).toBe('clip');
      if (dogPursue.kind === 'clip') {
        expect(dogPursue.clipName).toBe('walk');
        expect(dogPursue.loop).toBe(true);
      }
    });

    it('resolves Humanoid equipped posture static pose', () => {
      const humanoidIdle = resolveDroneAnimationState(DroneType.HUMANOID, DroneState.IDLE);
      expect(humanoidIdle.kind).toBe('static');
      if (humanoidIdle.kind === 'static') {
        expect(humanoidIdle.poseName).toBe('hold');
      }
    });

    it('resolves Wheeled Drone procedural wheel rolling on pursue', () => {
      const wheeledPursue = resolveDroneAnimationState(DroneType.WHEELED, DroneState.PURSUING);
      expect(wheeledPursue.kind).toBe('procedural');
      if (wheeledPursue.kind === 'procedural') {
        expect(wheeledPursue.system).toBe('wheel');
      }
    });

    it('resolves firing override when context indicates isFiring', () => {
      const rotaryAttack = resolveDroneAnimationState(DroneType.ROTARY_SHOOTER, DroneState.PURSUING, {
        isFiring: true,
      });
      expect(rotaryAttack.kind).toBe('procedural');
      if (rotaryAttack.kind === 'procedural') {
        expect(rotaryAttack.system).toBe('recoil');
      }
    });
  });
});
