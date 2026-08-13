export interface AudioManifestEntry {
  key: string;
  path: string;
  category: 'music' | 'sfx' | 'ui' | 'ambient';
  loop?: boolean;
}

export const AUDIO_MANIFEST: AudioManifestEntry[] = [
  // Music and ambient
  { key: 'vexea_theme', path: 'Audio/Music/vexea_theme.opus', category: 'music', loop: false },
  { key: 'iron_march', path: 'Audio/Music/iron_march.opus', category: 'music', loop: false },
  { key: 'factory_ambience', path: 'Audio/Music/factory_ambience.opus', category: 'music', loop: false },
  { key: 'distant_industrial_loop', path: 'Audio/Ambient/distant_industrial_loop.opus', category: 'ambient', loop: true },
  { key: 'exterior_base_loop', path: 'Audio/Ambient/exterior_base_loop.opus', category: 'ambient', loop: true },
  { key: 'interior_base_loop', path: 'Audio/Ambient/interior_base_loop.opus', category: 'ambient', loop: true },
  { key: 'wind_detail', path: 'Audio/Ambient/wind_detail.opus', category: 'ambient', loop: true },

  // Commander and drone audio
  { key: 'tracking_deep_loop', path: 'Audio/Sfx/Commander/tracking_deep_loop.opus', category: 'sfx', loop: true },
  { key: 'bomber_explosion', path: 'Audio/Sfx/Drones/bomber_explosion.opus', category: 'sfx', loop: false },
  { key: 'bomber_lock', path: 'Audio/Sfx/Drones/bomber_lock.opus', category: 'sfx', loop: false },
  { key: 'humanoid_gun_fire', path: 'Audio/Sfx/Drones/humanoid_gun_fire.opus', category: 'sfx', loop: false },
  { key: 'humanoid_mechanical_step', path: 'Audio/Sfx/Drones/humanoid_mechanical_step.opus', category: 'sfx', loop: false },
  { key: 'humanoid_servo', path: 'Audio/Sfx/Drones/humanoid_servo.opus', category: 'sfx', loop: false },
  { key: 'metal_ricochet', path: 'Audio/Sfx/Drones/metal_ricochet.opus', category: 'sfx', loop: false },
  { key: 'quadcopter_rifle_fire', path: 'Audio/Sfx/Drones/quadcopter_rifle_fire.opus', category: 'sfx', loop: false },
  { key: 'quadcopter_rotor_distant', path: 'Audio/Sfx/Drones/quadcopter_rotor_distant.opus', category: 'sfx', loop: true },
  { key: 'quadcopter_rotor_fast', path: 'Audio/Sfx/Drones/quadcopter_rotor_fast.opus', category: 'sfx', loop: true },
  { key: 'quadcopter_rotor_idle', path: 'Audio/Sfx/Drones/quadcopter_rotor_idle.opus', category: 'sfx', loop: true },
  { key: 'quadruped_step', path: 'Audio/Sfx/Drones/quadruped_step.opus', category: 'sfx', loop: false },
  { key: 'recon_scan_loop', path: 'Audio/Sfx/Drones/recon_scan_loop.opus', category: 'sfx', loop: true },
  { key: 'robot_dog_servo', path: 'Audio/Sfx/Drones/robot_dog_servo.opus', category: 'sfx', loop: false },
  { key: 'uav_flight_loop', path: 'Audio/Sfx/Drones/uav_flight_loop.opus', category: 'sfx', loop: true },
  { key: 'ugv_engine_loop', path: 'Audio/Sfx/Drones/ugv_engine_loop.opus', category: 'sfx', loop: true },
  { key: 'ugv_turret_fire', path: 'Audio/Sfx/Drones/ugv_turret_fire.opus', category: 'sfx', loop: false },

  // Player movement and surfaces
  { key: 'crouch', path: 'Audio/Sfx/Locomotion/crouch.opus', category: 'sfx', loop: false },
  { key: 'jump', path: 'Audio/Sfx/Locomotion/jump.opus', category: 'sfx', loop: false },
  { key: 'land', path: 'Audio/Sfx/Locomotion/land.opus', category: 'sfx', loop: false },
  { key: 'run_concrete_02', path: 'Audio/Sfx/Locomotion/run_concrete_02.opus', category: 'sfx', loop: true },
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
  { key: 'walk_concrete_01', path: 'Audio/Sfx/Locomotion/walk_concrete_01.opus', category: 'sfx', loop: true },

  // Player impacts and UI
  { key: 'damage_heavy', path: 'Audio/Sfx/Player/damage_heavy.opus', category: 'sfx', loop: false },
  { key: 'damage_light', path: 'Audio/Sfx/Player/damage_light.opus', category: 'sfx', loop: false },
  { key: 'hit_confirm', path: 'Audio/Sfx/Player/hit_confirm.opus', category: 'sfx', loop: false },
  { key: 'quick_turn', path: 'Audio/Sfx/Player/quick_turn.opus', category: 'sfx', loop: false },
  { key: 'click', path: 'Audio/Sfx/UI/click.opus', category: 'ui', loop: false },
  { key: 'error', path: 'Audio/Sfx/UI/error.opus', category: 'ui', loop: false },
  { key: 'credits_gain', path: 'Audio/Sfx/UI/credits_gain.opus', category: 'ui', loop: false },
  { key: 'credits_spend', path: 'Audio/Sfx/UI/credits_spend.opus', category: 'ui', loop: false },
  { key: 'join_match', path: 'Audio/Sfx/UI/join_match.opus', category: 'ui', loop: false },
  { key: 'level_up', path: 'Audio/Sfx/UI/level_up.opus', category: 'ui', loop: false },
  { key: 'match_end_motif', path: 'Audio/Sfx/UI/match_end_motif.opus', category: 'ui', loop: false },
  { key: 'notification', path: 'Audio/Sfx/UI/notification.opus', category: 'ui', loop: false },

  // Utilities
  { key: 'c4_detonate', path: 'Audio/Sfx/Utility/c4_detonate.opus', category: 'sfx', loop: false },
  { key: 'c4_place', path: 'Audio/Sfx/Utility/c4_place.opus', category: 'sfx', loop: false },
  { key: 'flashbang_detonate', path: 'Audio/Sfx/Utility/flashbang_detonate.opus', category: 'sfx', loop: false },
  { key: 'flashbang_throw', path: 'Audio/Sfx/Utility/flashbang_throw.opus', category: 'sfx', loop: false },
  { key: 'grenade_explosion', path: 'Audio/Sfx/Utility/grenade_explosion.opus', category: 'sfx', loop: false },
  { key: 'grenade_throw', path: 'Audio/Sfx/Utility/grenade_throw.opus', category: 'sfx', loop: false },
  { key: 'jammer_active_loop', path: 'Audio/Sfx/Utility/jammer_active_loop.opus', category: 'sfx', loop: true },
  { key: 'jammer_deploy', path: 'Audio/Sfx/Utility/jammer_deploy.opus', category: 'sfx', loop: false },
  { key: 'mine_deploy', path: 'Audio/Sfx/Utility/mine_deploy.opus', category: 'sfx', loop: false },
  { key: 'mine_trigger', path: 'Audio/Sfx/Utility/mine_trigger.opus', category: 'sfx', loop: false },
  { key: 'revive_complete', path: 'Audio/Sfx/Utility/revive_complete.opus', category: 'sfx', loop: false },
  { key: 'revive_start', path: 'Audio/Sfx/Utility/revive_start.opus', category: 'sfx', loop: false },

  // Weapons
  { key: 'ads', path: 'Audio/Sfx/Weapons/ads.opus', category: 'sfx', loop: false },
  { key: 'empty_click', path: 'Audio/Sfx/Weapons/empty_click.opus', category: 'sfx', loop: false },
  { key: 'pistol_fire', path: 'Audio/Sfx/Weapons/pistol_fire.opus', category: 'sfx', loop: false },
  { key: 'pistol_reload', path: 'Audio/Sfx/Weapons/pistol_reload.opus', category: 'sfx', loop: false },
  { key: 'reload', path: 'Audio/Sfx/Weapons/reload.opus', category: 'sfx', loop: false },
  { key: 'rifle_fire', path: 'Audio/Sfx/Weapons/rifle_fire.opus', category: 'sfx', loop: false },
  { key: 'rifle_reload', path: 'Audio/Sfx/Weapons/rifle_reload.opus', category: 'sfx', loop: false },
  { key: 'smg_fire', path: 'Audio/Sfx/Weapons/smg_fire.opus', category: 'sfx', loop: false }
];

export type AudioKey = typeof AUDIO_MANIFEST[number]['key'];

export const AUDIO_PATHS: Record<AudioKey, string> = AUDIO_MANIFEST.reduce((acc, entry) => {
  acc[entry.key] = entry.path;
  return acc;
}, {} as Record<AudioKey, string>);

export function getManifestEntry(key: string): AudioManifestEntry | undefined {
  return AUDIO_MANIFEST.find(e => e.key === key);
}
