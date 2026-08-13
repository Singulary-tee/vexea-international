export type AudioCategory = 'music' | 'sfx' | 'ui' | 'ambient';

export interface AudioManifestEntry {
  readonly key: string;
  readonly path: string;
  readonly category: AudioCategory;
  readonly loop?: boolean;
}

/**
 * Canonical VEXEA audio inventory. Every client sound must resolve through
 * this manifest and the R2 asset guard; there is no GitHub audio fallback.
 */
export const AUDIO_MANIFEST = [
  // Music and ambience
  { key: 'vexea_theme', path: 'Audio/Music/vexea_theme.opus', category: 'music' },
  { key: 'iron_march', path: 'Audio/Music/iron_march.opus', category: 'music' },
  { key: 'factory_ambience', path: 'Audio/Music/factory_ambience.opus', category: 'music' },
  { key: 'distant_industrial_loop', path: 'Audio/Ambient/distant_industrial_loop.opus', category: 'ambient', loop: true },
  { key: 'exterior_base_loop', path: 'Audio/Ambient/exterior_base_loop.opus', category: 'ambient', loop: true },
  { key: 'interior_base_loop', path: 'Audio/Ambient/interior_base_loop.opus', category: 'ambient', loop: true },
  { key: 'wind_detail', path: 'Audio/Ambient/wind_detail.opus', category: 'ambient', loop: true },

  // Commander and drone audio
  { key: 'tracking_deep_loop', path: 'Audio/Sfx/Commander/tracking_deep_loop.opus', category: 'sfx', loop: true },
  { key: 'bomber_explosion', path: 'Audio/Sfx/Drones/bomber_explosion.opus', category: 'sfx' },
  { key: 'bomber_lock', path: 'Audio/Sfx/Drones/bomber_lock.opus', category: 'sfx' },
  { key: 'humanoid_gun_fire', path: 'Audio/Sfx/Drones/humanoid_gun_fire.opus', category: 'sfx' },
  { key: 'humanoid_mechanical_step', path: 'Audio/Sfx/Drones/humanoid_mechanical_step.opus', category: 'sfx' },
  { key: 'humanoid_servo', path: 'Audio/Sfx/Drones/humanoid_servo.opus', category: 'sfx' },
  { key: 'quadcopter_rifle_fire', path: 'Audio/Sfx/Drones/quadcopter_rifle_fire.opus', category: 'sfx' },
  { key: 'quadcopter_rotor_distant', path: 'Audio/Sfx/Drones/quadcopter_rotor_distant.opus', category: 'sfx', loop: true },
  { key: 'quadcopter_rotor_fast', path: 'Audio/Sfx/Drones/quadcopter_rotor_fast.opus', category: 'sfx', loop: true },
  { key: 'quadcopter_rotor_idle', path: 'Audio/Sfx/Drones/quadcopter_rotor_idle.opus', category: 'sfx', loop: true },
  { key: 'quadruped_step', path: 'Audio/Sfx/Drones/quadruped_step.opus', category: 'sfx' },
  { key: 'recon_scan_loop', path: 'Audio/Sfx/Drones/recon_scan_loop.opus', category: 'sfx', loop: true },
  { key: 'robot_dog_servo', path: 'Audio/Sfx/Drones/robot_dog_servo.opus', category: 'sfx' },
  { key: 'uav_flight_loop', path: 'Audio/Sfx/Drones/uav_flight_loop.opus', category: 'sfx', loop: true },
  { key: 'ugv_engine_loop', path: 'Audio/Sfx/Drones/ugv_engine_loop.opus', category: 'sfx', loop: true },
  { key: 'ugv_turret_fire', path: 'Audio/Sfx/Drones/ugv_turret_fire.opus', category: 'sfx' },

  // Player movement
  { key: 'crouch', path: 'Audio/Sfx/Locomotion/crouch.opus', category: 'sfx' },
  { key: 'jump', path: 'Audio/Sfx/Locomotion/jump.opus', category: 'sfx' },
  { key: 'land', path: 'Audio/Sfx/Locomotion/land.opus', category: 'sfx' },
  { key: 'run_gravel_01', path: 'Audio/Sfx/Locomotion/run_gravel_01.opus', category: 'sfx', loop: true },
  { key: 'run_gravel_02', path: 'Audio/Sfx/Locomotion/run_gravel_02.opus', category: 'sfx', loop: true },
  { key: 'run_ground_01', path: 'Audio/Sfx/Locomotion/run_ground_01.opus', category: 'sfx', loop: true },
  { key: 'run_ground_02', path: 'Audio/Sfx/Locomotion/run_ground_02.opus', category: 'sfx', loop: true },
  { key: 'run_hard_01', path: 'Audio/Sfx/Locomotion/run_hard_01.opus', category: 'sfx', loop: true },
  { key: 'run_hard_02', path: 'Audio/Sfx/Locomotion/run_hard_02.opus', category: 'sfx', loop: true },
  { key: 'run_metal_01', path: 'Audio/Sfx/Locomotion/run_metal_01.opus', category: 'sfx', loop: true },
  { key: 'run_metal_02', path: 'Audio/Sfx/Locomotion/run_metal_02.opus', category: 'sfx', loop: true },
  { key: 'run_wood_01', path: 'Audio/Sfx/Locomotion/run_wood_01.opus', category: 'sfx', loop: true },
  { key: 'run_wood_02', path: 'Audio/Sfx/Locomotion/run_wood_02.opus', category: 'sfx', loop: true },
  { key: 'walk_gravel_01', path: 'Audio/Sfx/Locomotion/walk_gravel_01.opus', category: 'sfx', loop: true },
  { key: 'walk_gravel_02', path: 'Audio/Sfx/Locomotion/walk_gravel_02.opus', category: 'sfx', loop: true },
  { key: 'walk_ground_01', path: 'Audio/Sfx/Locomotion/walk_ground_01.opus', category: 'sfx', loop: true },
  { key: 'walk_ground_02', path: 'Audio/Sfx/Locomotion/walk_ground_02.opus', category: 'sfx', loop: true },
  { key: 'walk_hard_01', path: 'Audio/Sfx/Locomotion/walk_hard_01.opus', category: 'sfx', loop: true },
  { key: 'walk_hard_02', path: 'Audio/Sfx/Locomotion/walk_hard_02.opus', category: 'sfx', loop: true },
  { key: 'walk_metal_01', path: 'Audio/Sfx/Locomotion/walk_metal_01.opus', category: 'sfx', loop: true },
  { key: 'walk_metal_02', path: 'Audio/Sfx/Locomotion/walk_metal_02.opus', category: 'sfx', loop: true },
  { key: 'walk_wood_01', path: 'Audio/Sfx/Locomotion/walk_wood_01.opus', category: 'sfx', loop: true },
  { key: 'walk_wood_02', path: 'Audio/Sfx/Locomotion/walk_wood_02.opus', category: 'sfx', loop: true },

  // Player impacts and interface
  { key: 'damage_heavy', path: 'Audio/Sfx/Player/damage_heavy.opus', category: 'sfx' },
  { key: 'damage_light', path: 'Audio/Sfx/Player/damage_light.opus', category: 'sfx' },
  { key: 'hit_confirm', path: 'Audio/Sfx/Player/hit_confirm.opus', category: 'sfx' },
  { key: 'quick_turn', path: 'Audio/Sfx/Player/quick_turn.opus', category: 'sfx' },
  { key: 'click', path: 'Audio/Sfx/click.opus', category: 'ui' },
  { key: 'credits_gain', path: 'Audio/Sfx/UI/credits_gain.opus', category: 'ui' },
  { key: 'credits_spend', path: 'Audio/Sfx/UI/credits_spend.opus', category: 'ui' },
  { key: 'join_match', path: 'Audio/Sfx/UI/join_match.opus', category: 'ui' },
  { key: 'level_up', path: 'Audio/Sfx/UI/level_up.opus', category: 'ui' },
  { key: 'match_end_motif', path: 'Audio/Sfx/UI/match_end_motif.opus', category: 'ui' },
  { key: 'notification', path: 'Audio/Sfx/UI/notification.opus', category: 'ui' },

  // Utilities
  { key: 'c4_detonate', path: 'Audio/Sfx/Utility/c4_detonate.opus', category: 'sfx' },
  { key: 'c4_place', path: 'Audio/Sfx/Utility/c4_place.opus', category: 'sfx' },
  { key: 'flashbang_detonate', path: 'Audio/Sfx/Utility/flashbang_detonate.opus', category: 'sfx' },
  { key: 'flashbang_throw', path: 'Audio/Sfx/Utility/flashbang_throw.opus', category: 'sfx' },
  { key: 'grenade_explosion', path: 'Audio/Sfx/Utility/grenade_explosion.opus', category: 'sfx' },
  { key: 'grenade_throw', path: 'Audio/Sfx/Utility/grenade_throw.opus', category: 'sfx' },
  { key: 'jammer_active_loop', path: 'Audio/Sfx/Utility/jammer_active_loop.opus', category: 'sfx', loop: true },
  { key: 'jammer_deploy', path: 'Audio/Sfx/Utility/jammer_deploy.opus', category: 'sfx' },
  { key: 'mine_deploy', path: 'Audio/Sfx/Utility/mine_deploy.opus', category: 'sfx' },
  { key: 'mine_trigger', path: 'Audio/Sfx/Utility/mine_trigger.opus', category: 'sfx' },
  { key: 'revive_complete', path: 'Audio/Sfx/Utility/revive_complete.opus', category: 'sfx' },
  { key: 'revive_start', path: 'Audio/Sfx/Utility/revive_start.opus', category: 'sfx' },

  // Weapons
  { key: 'ads', path: 'Audio/Sfx/Weapons/ads.opus', category: 'sfx' },
  { key: 'empty_click', path: 'Audio/Sfx/Weapons/empty_click.opus', category: 'sfx' },
  { key: 'pistol_fire', path: 'Audio/Sfx/Weapons/pistol_fire.opus', category: 'sfx' },
  { key: 'reload', path: 'Audio/Sfx/Weapons/reload.opus', category: 'sfx' },
  { key: 'rifle_fire', path: 'Audio/Sfx/Weapons/rifle_fire.opus', category: 'sfx' },
  { key: 'smg_fire', path: 'Audio/Sfx/Weapons/smg_fire.opus', category: 'sfx' }
] as const satisfies readonly AudioManifestEntry[];

export type AudioKey = typeof AUDIO_MANIFEST[number]['key'];
export const AUDIO_PATHS = AUDIO_MANIFEST.map((entry) => entry.path);
export const AUDIO_PATH_BY_KEY: Record<AudioKey, string> = Object.fromEntries(
  AUDIO_MANIFEST.map((entry) => [entry.key, entry.path])
) as Record<AudioKey, string>;

export function getAudioEntry(keyOrPath: string) {
  return AUDIO_MANIFEST.find((entry) => entry.key === keyOrPath || entry.path === keyOrPath);
}
