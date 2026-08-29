import { DroneState, DroneType } from './constants';
import { ASSET_STRUCTURE } from './asset-structure';

/**
 * State classification for networked entities:
 * - TYPE_A: Fully networked state synced between server and client with visual representation.
 * - TYPE_B: Server-only or latent state requiring network packet synchronization updates.
 * - TYPE_C: Client-local or derived state (e.g. from local physics / inputs / interpolation).
 */
export type StateClassification = 'TYPE_A' | 'TYPE_B' | 'TYPE_C';

export type AnimationOutputKind = 'clip' | 'ikTarget' | 'procedural' | 'static';

export interface ClipAnimationOutput {
  kind: 'clip';
  clipName: string;
  loop?: boolean;
  speed?: number;
  crossFadeDuration?: number;
  clampWhenFinished?: boolean;
}

export interface IKTargetAnimationOutput {
  kind: 'ikTarget';
  targetNode: string;
  trackingAxis?: 'yaw' | 'pitch' | 'both';
  smoothFactor?: number;
}

export interface ProceduralAnimationOutput {
  kind: 'procedural';
  system: 'propeller' | 'wheel' | 'hoverSway' | 'recoil' | 'chassisVibration' | 'banking';
  intensity?: number;
}

export interface StaticAnimationOutput {
  kind: 'static';
  poseName?: string;
}

export type AnimationOutput =
  | ClipAnimationOutput
  | IKTargetAnimationOutput
  | ProceduralAnimationOutput
  | StaticAnimationOutput;

export interface StateAnimationMapping<TState extends string = string> {
  state: TState;
  classification: StateClassification;
  priority: number;
  mutuallyExclusiveWith?: readonly TState[];
  output: AnimationOutput;
  description: string;
}

export interface EntityAnimationContract<TState extends string = string> {
  entityType: string;
  modelKey?: string;
  availableClips: readonly string[];
  states: readonly StateAnimationMapping<TState>[];
}

// ---------------------------------------------------------------------------
// Player Animation Contract & States
// ---------------------------------------------------------------------------

export type PlayerAnimationStateKey =
  | 'DEAD'
  | 'RELOADING'
  | 'FIRING'
  | 'JUMPING'
  | 'SPRINTING'
  | 'CROUCH_WALK'
  | 'CROUCH_IDLE'
  | 'WALKING'
  | 'AIM_IDLE'
  | 'IDLE';

export const PLAYER_AVAILABLE_CLIPS: readonly string[] = [
  'rifle_idle',
  'rifle_aim_idle',
  'rifle_run',
  'rifle_fire',
  'pistol_idle',
  'pistol_jump_2',
  'pistol_jump',
  'pistol_kneel_to_stand',
  'pistol_kneeling_idle',
  'pistol_run_arc_2',
  'pistol_run_arc',
  'pistol_run_backward_arc_2',
  'pistol_run_backward_arc',
  'pistol_run_backward',
  'pistol_run',
  'pistol_stand_to_kneel',
  'pistol_strafe_2',
  'pistol_strafe',
  'pistol_walk_arc_2',
  'pistol_walk_arc',
  'pistol_walk_backward_arc_2',
  'pistol_walk_backward_arc',
  'pistol_walk_backward',
  'pistol_walk',
];

export const PLAYER_ANIMATION_CONTRACT: EntityAnimationContract<PlayerAnimationStateKey> = {
  entityType: 'player',
  modelKey: 'Player_one-optimized.glb',
  availableClips: PLAYER_AVAILABLE_CLIPS,
  states: [
    {
      state: 'DEAD',
      classification: 'TYPE_A',
      priority: 100,
      mutuallyExclusiveWith: ['FIRING', 'RELOADING', 'JUMPING', 'SPRINTING', 'WALKING', 'AIM_IDLE', 'IDLE'],
      output: {
        kind: 'clip',
        clipName: 'pistol_kneeling_idle',
        loop: false,
        crossFadeDuration: 0.2,
        clampWhenFinished: true,
      },
      description: 'Player health depleted; enter death pose',
    },
    {
      state: 'RELOADING',
      classification: 'TYPE_A',
      priority: 80,
      mutuallyExclusiveWith: ['FIRING', 'DEAD'],
      output: {
        kind: 'clip',
        clipName: 'rifle_aim_idle',
        loop: true,
        crossFadeDuration: 0.15,
      },
      description: 'Active weapon reload in progress',
    },
    {
      state: 'FIRING',
      classification: 'TYPE_A',
      priority: 70,
      mutuallyExclusiveWith: ['RELOADING', 'DEAD'],
      output: {
        kind: 'clip',
        clipName: 'rifle_fire',
        loop: false,
        speed: 1.0,
        crossFadeDuration: 0.05,
      },
      description: 'Primary or secondary trigger discharge',
    },
    {
      state: 'JUMPING',
      classification: 'TYPE_A',
      priority: 60,
      mutuallyExclusiveWith: ['DEAD', 'CROUCH_IDLE', 'CROUCH_WALK'],
      output: {
        kind: 'clip',
        clipName: 'pistol_jump',
        loop: false,
        crossFadeDuration: 0.1,
      },
      description: 'Player airborne from jump or falling',
    },
    {
      state: 'SPRINTING',
      classification: 'TYPE_A',
      priority: 50,
      mutuallyExclusiveWith: ['DEAD', 'CROUCH_IDLE', 'CROUCH_WALK', 'AIM_IDLE', 'IDLE'],
      output: {
        kind: 'clip',
        clipName: 'rifle_run',
        loop: true,
        speed: 1.0,
        crossFadeDuration: 0.2,
      },
      description: 'High-speed forward sprint locomotion',
    },
    {
      state: 'CROUCH_WALK',
      classification: 'TYPE_A',
      priority: 45,
      mutuallyExclusiveWith: ['DEAD', 'SPRINTING', 'JUMPING', 'IDLE'],
      output: {
        kind: 'clip',
        clipName: 'pistol_walk',
        loop: true,
        speed: 0.7,
        crossFadeDuration: 0.2,
      },
      description: 'Crouched locomotion',
    },
    {
      state: 'CROUCH_IDLE',
      classification: 'TYPE_A',
      priority: 40,
      mutuallyExclusiveWith: ['DEAD', 'SPRINTING', 'JUMPING', 'WALKING'],
      output: {
        kind: 'clip',
        clipName: 'pistol_kneeling_idle',
        loop: true,
        crossFadeDuration: 0.2,
      },
      description: 'Stationary crouched / kneeling stance',
    },
    {
      state: 'WALKING',
      classification: 'TYPE_A',
      priority: 30,
      mutuallyExclusiveWith: ['DEAD', 'SPRINTING', 'IDLE'],
      output: {
        kind: 'clip',
        clipName: 'pistol_walk',
        loop: true,
        speed: 1.0,
        crossFadeDuration: 0.2,
      },
      description: 'Standard movement speed locomotion',
    },
    {
      state: 'AIM_IDLE',
      classification: 'TYPE_A',
      priority: 20,
      mutuallyExclusiveWith: ['DEAD', 'SPRINTING'],
      output: {
        kind: 'clip',
        clipName: 'rifle_aim_idle',
        loop: true,
        crossFadeDuration: 0.2,
      },
      description: 'Aiming down sights in stationary stance',
    },
    {
      state: 'IDLE',
      classification: 'TYPE_A',
      priority: 10,
      mutuallyExclusiveWith: ['DEAD', 'WALKING', 'SPRINTING'],
      output: {
        kind: 'clip',
        clipName: 'rifle_idle',
        loop: true,
        crossFadeDuration: 0.25,
      },
      description: 'Default relaxed upright idle stance',
    },
  ],
};

export interface PlayerAnimationContext {
  isAlive: boolean;
  isFiring?: boolean;
  isReloading?: boolean;
  speed?: number;
  isGrounded?: boolean;
  isCrouching?: boolean;
  isSprinting?: boolean;
  isAiming?: boolean;
  weapon?: string;
}

/**
 * Resolves the primary animation output for a player given their network/local state context.
 */
export function resolvePlayerAnimationState(ctx: PlayerAnimationContext): AnimationOutput {
  if (!ctx.isAlive) {
    return {
      kind: 'clip',
      clipName: 'pistol_kneeling_idle',
      loop: false,
      crossFadeDuration: 0.2,
      clampWhenFinished: true,
    };
  }

  const isPistol = ctx.weapon === 'pistol';

  if (ctx.isReloading) {
    return {
      kind: 'clip',
      clipName: isPistol ? 'pistol_idle' : 'rifle_aim_idle',
      loop: true,
      crossFadeDuration: 0.15,
    };
  }

  if (ctx.isFiring) {
    return {
      kind: 'clip',
      clipName: isPistol ? 'pistol_idle' : 'rifle_fire',
      loop: false,
      speed: 1.0,
      crossFadeDuration: 0.05,
    };
  }

  if (ctx.isGrounded === false) {
    return {
      kind: 'clip',
      clipName: 'pistol_jump',
      loop: false,
      crossFadeDuration: 0.1,
    };
  }

  const speed = ctx.speed ?? 0;
  const isMoving = speed > 0.1;

  if (ctx.isCrouching) {
    if (isMoving) {
      return {
        kind: 'clip',
        clipName: 'pistol_walk',
        loop: true,
        speed: 0.7,
        crossFadeDuration: 0.2,
      };
    }
    return {
      kind: 'clip',
      clipName: 'pistol_kneeling_idle',
      loop: true,
      crossFadeDuration: 0.2,
    };
  }

  if (ctx.isSprinting && speed > 5.0) {
    return {
      kind: 'clip',
      clipName: isPistol ? 'pistol_run' : 'rifle_run',
      loop: true,
      speed: 1.0,
      crossFadeDuration: 0.2,
    };
  }

  if (isMoving) {
    return {
      kind: 'clip',
      clipName: isPistol ? 'pistol_walk' : 'rifle_run',
      loop: true,
      speed: Math.max(0.6, Math.min(speed / 4.0, 1.2)),
      crossFadeDuration: 0.2,
    };
  }

  if (ctx.isAiming) {
    return {
      kind: 'clip',
      clipName: isPistol ? 'pistol_idle' : 'rifle_aim_idle',
      loop: true,
      crossFadeDuration: 0.2,
    };
  }

  return {
    kind: 'clip',
    clipName: isPistol ? 'pistol_idle' : 'rifle_idle',
    loop: true,
    crossFadeDuration: 0.25,
  };
}

// ---------------------------------------------------------------------------
// Drone Animation Contracts & States
// ---------------------------------------------------------------------------

export type DroneAnimationStateKey =
  | 'IDLE'
  | 'PATROLLING'
  | 'PURSUING'
  | 'ATTACKING'
  | 'REPOSITIONING'
  | 'DEAD';

const DRONE_STATE_MAP: Record<DroneState, DroneAnimationStateKey> = {
  [DroneState.IDLE]: 'IDLE',
  [DroneState.PATROLLING]: 'PATROLLING',
  [DroneState.PURSUING]: 'PURSUING',
  [DroneState.ATTACKING]: 'ATTACKING',
  [DroneState.REPOSITIONING]: 'REPOSITIONING',
  [DroneState.DEAD]: 'DEAD',
};

function createStandardAirDroneContract(
  droneType: DroneType,
  modelKey?: string,
): EntityAnimationContract<DroneAnimationStateKey> {
  return {
    entityType: `drone_${droneType}`,
    modelKey,
    availableClips: ['spin', 'sway'],
    states: [
      {
        state: 'DEAD',
        classification: 'TYPE_A',
        priority: 100,
        mutuallyExclusiveWith: ['IDLE', 'PATROLLING', 'PURSUING', 'ATTACKING', 'REPOSITIONING'],
        output: { kind: 'procedural', system: 'propeller', intensity: 0 },
        description: 'Drone destroyed; halt lift propulsion and trigger destruction visual',
      },
      {
        state: 'ATTACKING',
        classification: 'TYPE_A',
        priority: 80,
        output: { kind: 'procedural', system: 'recoil', intensity: 1.0 },
        description: 'Weapon burst discharge with barrel/mount recoil kick',
      },
      {
        state: 'PURSUING',
        classification: 'TYPE_A',
        priority: 60,
        output: { kind: 'procedural', system: 'banking', intensity: 0.8 },
        description: 'High-speed target chase with banking orientation tilt',
      },
      {
        state: 'REPOSITIONING',
        classification: 'TYPE_A',
        priority: 50,
        output: { kind: 'procedural', system: 'hoverSway', intensity: 0.6 },
        description: 'Tactical evasion or flanking reposition maneuver',
      },
      {
        state: 'PATROLLING',
        classification: 'TYPE_A',
        priority: 30,
        output: { kind: 'procedural', system: 'hoverSway', intensity: 0.4 },
        description: 'Waypoint navigation with gentle hover oscillation',
      },
      {
        state: 'IDLE',
        classification: 'TYPE_A',
        priority: 10,
        output: { kind: 'procedural', system: 'propeller', intensity: 0.5 },
        description: 'Stationary hover awaiting sensor stimulation',
      },
    ],
  };
}

export const DRONE_ANIMATION_CONTRACTS: Record<DroneType, EntityAnimationContract<DroneAnimationStateKey>> = {
  [DroneType.ROTARY_SHOOTER]: createStandardAirDroneContract(DroneType.ROTARY_SHOOTER, 'rotary_shooter.glb'),
  [DroneType.BOMBER]: createStandardAirDroneContract(DroneType.BOMBER, 'bomber.glb'),
  [DroneType.RECON]: createStandardAirDroneContract(DroneType.RECON, 'recon.glb'),
  [DroneType.FIXED_WING]: createStandardAirDroneContract(DroneType.FIXED_WING, 'fixed_wing.glb'),

  [DroneType.WHEELED]: {
    entityType: `drone_${DroneType.WHEELED}`,
    modelKey: 'wheeled_drone.glb',
    availableClips: [],
    states: [
      {
        state: 'DEAD',
        classification: 'TYPE_A',
        priority: 100,
        output: { kind: 'static', poseName: 'destroyed' },
        description: 'Wheeled chassis disabled',
      },
      {
        state: 'ATTACKING',
        classification: 'TYPE_A',
        priority: 80,
        output: { kind: 'procedural', system: 'recoil', intensity: 1.0 },
        description: 'Turret cannon recoil with chassis vibration',
      },
      {
        state: 'PURSUING',
        classification: 'TYPE_A',
        priority: 60,
        output: { kind: 'procedural', system: 'wheel', intensity: 1.0 },
        description: 'Forward drive with wheel angular roll and suspension vibration',
      },
      {
        state: 'REPOSITIONING',
        classification: 'TYPE_A',
        priority: 50,
        output: { kind: 'procedural', system: 'wheel', intensity: 0.8 },
        description: 'Tactical reverse or turn pivot roll',
      },
      {
        state: 'PATROLLING',
        classification: 'TYPE_A',
        priority: 30,
        output: { kind: 'procedural', system: 'wheel', intensity: 0.5 },
        description: 'Cruising patrol wheel roll',
      },
      {
        state: 'IDLE',
        classification: 'TYPE_A',
        priority: 10,
        output: { kind: 'static', poseName: 'parked' },
        description: 'Engine idling, wheels locked',
      },
    ],
  },

  [DroneType.ROBOT_DOG]: {
    entityType: `drone_${DroneType.ROBOT_DOG}`,
    modelKey: 'robot_dog.glb',
    availableClips: ['walk'],
    states: [
      {
        state: 'DEAD',
        classification: 'TYPE_A',
        priority: 100,
        output: { kind: 'static', poseName: 'collapsed' },
        description: 'Quadruped power loss collapse',
      },
      {
        state: 'ATTACKING',
        classification: 'TYPE_A',
        priority: 80,
        output: { kind: 'procedural', system: 'recoil', intensity: 0.8 },
        description: 'Spinal mounted weapon burst recoil',
      },
      {
        state: 'PURSUING',
        classification: 'TYPE_A',
        priority: 60,
        output: { kind: 'clip', clipName: 'walk', loop: true, speed: 1.5, crossFadeDuration: 0.15 },
        description: 'Rapid quadruped sprint toward target',
      },
      {
        state: 'REPOSITIONING',
        classification: 'TYPE_A',
        priority: 50,
        output: { kind: 'clip', clipName: 'walk', loop: true, speed: 1.0, crossFadeDuration: 0.2 },
        description: 'Flanking lateral gait',
      },
      {
        state: 'PATROLLING',
        classification: 'TYPE_A',
        priority: 30,
        output: { kind: 'clip', clipName: 'walk', loop: true, speed: 0.8, crossFadeDuration: 0.2 },
        description: 'Stealth patrol gait',
      },
      {
        state: 'IDLE',
        classification: 'TYPE_A',
        priority: 10,
        output: { kind: 'static', poseName: 'stand_ready' },
        description: 'Quadruped ready stance',
      },
    ],
  },

  [DroneType.HUMANOID]: {
    entityType: `drone_${DroneType.HUMANOID}`,
    modelKey: 'humanoid-optimized.glb',
    availableClips: ['hold'],
    states: [
      {
        state: 'DEAD',
        classification: 'TYPE_A',
        priority: 100,
        output: { kind: 'static', poseName: 'hold' },
        description: 'Humanoid unit deactivated',
      },
      {
        state: 'ATTACKING',
        classification: 'TYPE_A',
        priority: 80,
        output: { kind: 'procedural', system: 'recoil', intensity: 0.5 },
        description: 'Rifled weapon fire recoil in equipped stance',
      },
      {
        state: 'PURSUING',
        classification: 'TYPE_A',
        priority: 60,
        output: { kind: 'static', poseName: 'hold' },
        description: 'Authored equipped posture movement',
      },
      {
        state: 'REPOSITIONING',
        classification: 'TYPE_A',
        priority: 50,
        output: { kind: 'static', poseName: 'hold' },
        description: 'Authored equipped posture repositioning',
      },
      {
        state: 'PATROLLING',
        classification: 'TYPE_A',
        priority: 30,
        output: { kind: 'static', poseName: 'hold' },
        description: 'Authored equipped posture patrol',
      },
      {
        state: 'IDLE',
        classification: 'TYPE_A',
        priority: 10,
        output: { kind: 'static', poseName: 'hold' },
        description: 'Exact saved F90 equipped stance',
      },
    ],
  },

  [DroneType.TEST_ENTITY]: {
    entityType: `drone_${DroneType.TEST_ENTITY}`,
    modelKey: undefined,
    availableClips: [],
    states: [
      {
        state: 'DEAD',
        classification: 'TYPE_A',
        priority: 100,
        output: { kind: 'static', poseName: 'inactive' },
        description: 'Test entity disabled',
      },
      {
        state: 'ATTACKING',
        classification: 'TYPE_A',
        priority: 80,
        output: { kind: 'static', poseName: 'active' },
        description: 'Test entity attacking',
      },
      {
        state: 'PURSUING',
        classification: 'TYPE_A',
        priority: 60,
        output: { kind: 'static', poseName: 'active' },
        description: 'Test entity chasing',
      },
      {
        state: 'REPOSITIONING',
        classification: 'TYPE_A',
        priority: 50,
        output: { kind: 'static', poseName: 'active' },
        description: 'Test entity repositioning',
      },
      {
        state: 'PATROLLING',
        classification: 'TYPE_A',
        priority: 30,
        output: { kind: 'static', poseName: 'active' },
        description: 'Test entity patrolling',
      },
      {
        state: 'IDLE',
        classification: 'TYPE_A',
        priority: 10,
        output: { kind: 'static', poseName: 'active' },
        description: 'Test entity idle',
      },
    ],
  },
};

export interface DroneAnimationContext {
  speed?: number;
  isFiring?: boolean;
  playerInFOV?: boolean;
}

/**
 * Resolves the active animation output for a given drone type and state.
 */
export function resolveDroneAnimationState(
  droneType: DroneType,
  droneState: DroneState,
  ctx?: DroneAnimationContext,
): AnimationOutput {
  const contract = DRONE_ANIMATION_CONTRACTS[droneType] || DRONE_ANIMATION_CONTRACTS[DroneType.TEST_ENTITY];
  const stateKey = DRONE_STATE_MAP[droneState] ?? 'IDLE';

  if (ctx?.isFiring && droneState !== DroneState.DEAD) {
    const attackingMapping = contract.states.find((s) => s.state === 'ATTACKING');
    if (attackingMapping) {
      return attackingMapping.output;
    }
  }

  const mapping = contract.states.find((s) => s.state === stateKey);
  if (mapping) {
    return mapping.output;
  }

  // Safe fallback to IDLE mapping or static output
  const idleMapping = contract.states.find((s) => s.state === 'IDLE');
  return idleMapping?.output ?? { kind: 'static', poseName: 'default' };
}

// ---------------------------------------------------------------------------
// Runtime & Compile-time Contract Validation
// ---------------------------------------------------------------------------

export interface ContractValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates the full entity animation contract system at startup.
 * Ensures all drone types and states have exhaustive, conflict-free mappings.
 */
export function validateEntityAnimationContracts(): ContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate Player Contract
  const playerClips = new Set(PLAYER_ANIMATION_CONTRACT.availableClips);
  for (const stateMapping of PLAYER_ANIMATION_CONTRACT.states) {
    if (stateMapping.output.kind === 'clip') {
      if (!playerClips.has(stateMapping.output.clipName)) {
        errors.push(`Player contract state '${stateMapping.state}' references unlisted clip '${stateMapping.output.clipName}'`);
      }
    }
  }

  // Validate Drone Contracts
  const requiredDroneStates: DroneState[] = [
    DroneState.IDLE,
    DroneState.PATROLLING,
    DroneState.PURSUING,
    DroneState.ATTACKING,
    DroneState.REPOSITIONING,
    DroneState.DEAD,
  ];

  const allDroneTypes: DroneType[] = [
    DroneType.ROTARY_SHOOTER,
    DroneType.BOMBER,
    DroneType.RECON,
    DroneType.FIXED_WING,
    DroneType.WHEELED,
    DroneType.ROBOT_DOG,
    DroneType.HUMANOID,
    DroneType.TEST_ENTITY,
  ];

  for (const droneType of allDroneTypes) {
    const contract = DRONE_ANIMATION_CONTRACTS[droneType];
    if (!contract) {
      errors.push(`Missing animation contract for DroneType ${droneType}`);
      continue;
    }

    const coveredStates = new Set(contract.states.map((s) => s.state));
    for (const dState of requiredDroneStates) {
      const stateKey = DRONE_STATE_MAP[dState];
      if (!coveredStates.has(stateKey)) {
        errors.push(`DroneType ${droneType} is missing state mapping for '${stateKey}' (DroneState.${DroneState[dState]})`);
      }
    }

    // Verify clips if modelKey exists in ASSET_STRUCTURE
    if (contract.modelKey && ASSET_STRUCTURE[contract.modelKey]) {
      const assetMeta = ASSET_STRUCTURE[contract.modelKey];
      const modelClipNames = new Set(assetMeta.animations.map((a) => a.name));
      for (const stateMapping of contract.states) {
        if (stateMapping.output.kind === 'clip') {
          if (!modelClipNames.has(stateMapping.output.clipName)) {
            // Note: If asset has no tracks (like static humanoid or procedural air drones), verify availableClips
            if (!contract.availableClips.includes(stateMapping.output.clipName)) {
              warnings.push(`DroneType ${droneType} state '${stateMapping.state}' references clip '${stateMapping.output.clipName}' not found in ${contract.modelKey}`);
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
