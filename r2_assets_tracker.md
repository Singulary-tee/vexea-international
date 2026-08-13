# VEXEA Cloudflare R2 Assets Tracker

> [!WARNING]
> **CRITICAL REPOSITORY RULE (DISCLAIMER):**
> This Asset Tracker documents assets hosted in the Cloudflare R2 bucket (`https://vexea-r2-asset-guard.alte.workers.dev`).
> All heavy assets MUST be hosted in the R2 bucket and dynamically retrieved by the client loading sequence.
>
> **ASSET RESPONSIBILITY RESOLUTION:**
> - **Visual Media, Video, and 3D Models (.glb/.webm/.webp)**: Cataloged in `/r2_assets_tracker.json` for client preloading.
> - **Spatial Audio Suite (.opus)**: Managed **exclusively** via `/client/audio-manifest.ts`, which serves as the compiler's absolute compile-time single source of truth for all game SFX, loops, and scores.

## Base URL
`https://vexea-r2-asset-guard.alte.workers.dev/`

## 1. 3D Models & Game Assets

| Asset Name | Category | R2 Path (Target) |
| :--- | :--- | :--- |
| `main_menu_1.webm` | Video | `Video/Backgrounds/main_menu_1.webm` |
| `lobby_1.webm` | Video | `Video/Backgrounds/lobby_1.webm` |
| `assault_card_1.webp` | Image | `Images/Cards/assault_card_1.webp` |
| `demolition_card_1.webp` | Image | `Images/Cards/demolition_card_1.webp` |
| `medic_card_1.webp` | Image | `Images/Cards/medic_card_1.webp` |
| `recon_card_1.webp` | Image | `Images/Cards/recon_card_1.webp` |
| `main_menu_1.jpg` | Image | `Images/Backgrounds/main_menu_1.jpg` |
| `faction_card_1.jpg` | Image | `Images/Cards/faction_card_1.jpg` |
| `infiltration_card_1.png` | Image | `Images/Cards/infiltration_card_1.png` |
| `intel_card_1.jpg` | Image | `Images/Cards/intel_card_1.jpg` |
| `leaderboard_card_1.jpg` | Image | `Images/Cards/leaderboard_card_1.jpg` |
| `squad_card_1.jpg` | Image | `Images/Cards/squad_card_1.jpg` |
| `promo_rifle_1.jpg` | Image | `Images/promotional/promo_rifle_1.jpg` |
| `Player_one-optimized.glb` | Asset | `Models/Entities/Player_one-optimized.glb` |
| `humanoid-optimized.glb` | Asset | `Models/Entities/humanoid-optimized.glb` |
| `quadcopter_bmb-optimized.glb` | Asset | `Models/Entities/quadcopter_bmb-optimized.glb` |
| `quadcopter_cam-optimized.glb` | Asset | `Models/Entities/quadcopter_cam-optimized.glb` |
| `quadcopter_rifle-optimized.glb` | Asset | `Models/Entities/quadcopter_rifle-optimized.glb` |
| `uav-optimized.glb` | Asset | `Models/Entities/uav-optimized.glb` |
| `ugv-optimized.glb` | Asset | `Models/Entities/ugv-optimized.glb` |
| `attachments-optimized.glb` | Asset | `Models/Weapons/attachments-optimized.glb` |
| `brn_180-optimized.glb` | Asset | `Models/Weapons/brn_180-optimized.glb` |
| `f_90-optimized.glb` | Asset | `Models/Weapons/f_90-optimized.glb` |
| `hk_51-optimized.glb` | Asset | `Models/Weapons/hk_51-optimized.glb` |
| `scar_h_mk_17-optimized.glb` | Asset | `Models/Weapons/scar_h_mk_17-optimized.glb` |
| `scar_l-optimized.glb` | Asset | `Models/Weapons/scar_l-optimized.glb` |

## 2. Audio Assets

| Asset Name | Category | R2 Path (Target) |
| :--- | :--- | :--- |
| `vexea_theme.opus` | Music | `Audio/Music/vexea_theme.opus` |
| `iron_march.opus` | Music | `Audio/Music/iron_march.opus` |
| `factory_ambience.opus` | Music | `Audio/Music/factory_ambience.opus` |
| `distant_industrial_loop.opus` | Ambient | `Audio/Ambient/distant_industrial_loop.opus` |
| `exterior_base_loop.opus` | Ambient | `Audio/Ambient/exterior_base_loop.opus` |
| `interior_base_loop.opus` | Ambient | `Audio/Ambient/interior_base_loop.opus` |
| `wind_detail.opus` | Ambient | `Audio/Ambient/wind_detail.opus` |
| `tracking_deep_loop.opus` | Sfx | `Audio/Sfx/Commander/tracking_deep_loop.opus` |
| `bomber_explosion.opus` | Sfx | `Audio/Sfx/Drones/bomber_explosion.opus` |
| `bomber_lock.opus` | Sfx | `Audio/Sfx/Drones/bomber_lock.opus` |
| `humanoid_gun_fire.opus` | Sfx | `Audio/Sfx/Drones/humanoid_gun_fire.opus` |
| `humanoid_mechanical_step.opus` | Sfx | `Audio/Sfx/Drones/humanoid_mechanical_step.opus` |
| `humanoid_servo.opus` | Sfx | `Audio/Sfx/Drones/humanoid_servo.opus` |
| `metal_ricochet.opus` | Sfx | `Audio/Sfx/Drones/metal_ricochet.opus` |
| `quadcopter_rifle_fire.opus` | Sfx | `Audio/Sfx/Drones/quadcopter_rifle_fire.opus` |
| `quadcopter_rotor_distant.opus` | Sfx | `Audio/Sfx/Drones/quadcopter_rotor_distant.opus` |
| `quadcopter_rotor_fast.opus` | Sfx | `Audio/Sfx/Drones/quadcopter_rotor_fast.opus` |
| `quadcopter_rotor_idle.opus` | Sfx | `Audio/Sfx/Drones/quadcopter_rotor_idle.opus` |
| `quadruped_step.opus` | Sfx | `Audio/Sfx/Drones/quadruped_step.opus` |
| `recon_scan_loop.opus` | Sfx | `Audio/Sfx/Drones/recon_scan_loop.opus` |
| `robot_dog_servo.opus` | Sfx | `Audio/Sfx/Drones/robot_dog_servo.opus` |
| `uav_flight_loop.opus` | Sfx | `Audio/Sfx/Drones/uav_flight_loop.opus` |
| `ugv_engine_loop.opus` | Sfx | `Audio/Sfx/Drones/ugv_engine_loop.opus` |
| `ugv_turret_fire.opus` | Sfx | `Audio/Sfx/Drones/ugv_turret_fire.opus` |
| `crouch.opus` | Sfx | `Audio/Sfx/Locomotion/crouch.opus` |
| `jump.opus` | Sfx | `Audio/Sfx/Locomotion/jump.opus` |
| `land.opus` | Sfx | `Audio/Sfx/Locomotion/land.opus` |
| `run_gravel_01.opus` | Sfx | `Audio/Sfx/Locomotion/run_gravel_01.opus` |
| `run_gravel_02.opus` | Sfx | `Audio/Sfx/Locomotion/run_gravel_02.opus` |
| `run_ground_01.opus` | Sfx | `Audio/Sfx/Locomotion/run_ground_01.opus` |
| `run_ground_02.opus` | Sfx | `Audio/Sfx/Locomotion/run_ground_02.opus` |
| `run_concrete_02.opus` | Sfx | `Audio/Sfx/Locomotion/run_concrete_02.opus` |
| `run_hard_01.opus` | Sfx | `Audio/Sfx/Locomotion/run_hard_01.opus` |
| `run_hard_02.opus` | Sfx | `Audio/Sfx/Locomotion/run_hard_02.opus` |
| `run_metal_01.opus` | Sfx | `Audio/Sfx/Locomotion/run_metal_01.opus` |
| `run_metal_02.opus` | Sfx | `Audio/Sfx/Locomotion/run_metal_02.opus` |
| `run_wood_01.opus` | Sfx | `Audio/Sfx/Locomotion/run_wood_01.opus` |
| `run_wood_02.opus` | Sfx | `Audio/Sfx/Locomotion/run_wood_02.opus` |
| `walk_gravel_01.opus` | Sfx | `Audio/Sfx/Locomotion/walk_gravel_01.opus` |
| `walk_gravel_02.opus` | Sfx | `Audio/Sfx/Locomotion/walk_gravel_02.opus` |
| `walk_ground_01.opus` | Sfx | `Audio/Sfx/Locomotion/walk_ground_01.opus` |
| `walk_ground_02.opus` | Sfx | `Audio/Sfx/Locomotion/walk_ground_02.opus` |
| `walk_concrete_01.opus` | Sfx | `Audio/Sfx/Locomotion/walk_concrete_01.opus` |
| `walk_hard_01.opus` | Sfx | `Audio/Sfx/Locomotion/walk_hard_01.opus` |
| `walk_hard_02.opus` | Sfx | `Audio/Sfx/Locomotion/walk_hard_02.opus` |
| `walk_metal_01.opus` | Sfx | `Audio/Sfx/Locomotion/walk_metal_01.opus` |
| `walk_metal_02.opus` | Sfx | `Audio/Sfx/Locomotion/walk_metal_02.opus` |
| `walk_wood_01.opus` | Sfx | `Audio/Sfx/Locomotion/walk_wood_01.opus` |
| `walk_wood_02.opus` | Sfx | `Audio/Sfx/Locomotion/walk_wood_02.opus` |
| `damage_heavy.opus` | Sfx | `Audio/Sfx/Player/damage_heavy.opus` |
| `damage_light.opus` | Sfx | `Audio/Sfx/Player/damage_light.opus` |
| `hit_confirm.opus` | Sfx | `Audio/Sfx/Player/hit_confirm.opus` |
| `quick_turn.opus` | Sfx | `Audio/Sfx/Player/quick_turn.opus` |
| `click.opus` | Ui | `Audio/Sfx/UI/click.opus` |
| `error.opus` | Ui | `Audio/Sfx/UI/error.opus` |
| `credits_gain.opus` | Ui | `Audio/Sfx/UI/credits_gain.opus` |
| `credits_spend.opus` | Ui | `Audio/Sfx/UI/credits_spend.opus` |
| `join_match.opus` | Ui | `Audio/Sfx/UI/join_match.opus` |
| `level_up.opus` | Ui | `Audio/Sfx/UI/level_up.opus` |
| `match_end_motif.opus` | Ui | `Audio/Sfx/UI/match_end_motif.opus` |
| `notification.opus` | Ui | `Audio/Sfx/UI/notification.opus` |
| `c4_detonate.opus` | Sfx | `Audio/Sfx/Utility/c4_detonate.opus` |
| `c4_place.opus` | Sfx | `Audio/Sfx/Utility/c4_place.opus` |
| `flashbang_detonate.opus` | Sfx | `Audio/Sfx/Utility/flashbang_detonate.opus` |
| `flashbang_throw.opus` | Sfx | `Audio/Sfx/Utility/flashbang_throw.opus` |
| `grenade_explosion.opus` | Sfx | `Audio/Sfx/Utility/grenade_explosion.opus` |
| `grenade_throw.opus` | Sfx | `Audio/Sfx/Utility/grenade_throw.opus` |
| `jammer_active_loop.opus` | Sfx | `Audio/Sfx/Utility/jammer_active_loop.opus` |
| `jammer_deploy.opus` | Sfx | `Audio/Sfx/Utility/jammer_deploy.opus` |
| `mine_deploy.opus` | Sfx | `Audio/Sfx/Utility/mine_deploy.opus` |
| `mine_trigger.opus` | Sfx | `Audio/Sfx/Utility/mine_trigger.opus` |
| `revive_complete.opus` | Sfx | `Audio/Sfx/Utility/revive_complete.opus` |
| `revive_start.opus` | Sfx | `Audio/Sfx/Utility/revive_start.opus` |
| `ads.opus` | Sfx | `Audio/Sfx/Weapons/ads.opus` |
| `empty_click.opus` | Sfx | `Audio/Sfx/Weapons/empty_click.opus` |
| `pistol_fire.opus` | Sfx | `Audio/Sfx/Weapons/pistol_fire.opus` |
| `pistol_reload.opus` | Sfx | `Audio/Sfx/Weapons/pistol_reload.opus` |
| `reload.opus` | Sfx | `Audio/Sfx/Weapons/reload.opus` |
| `rifle_fire.opus` | Sfx | `Audio/Sfx/Weapons/rifle_fire.opus` |
| `rifle_reload.opus` | Sfx | `Audio/Sfx/Weapons/rifle_reload.opus` |
| `smg_fire.opus` | Sfx | `Audio/Sfx/Weapons/smg_fire.opus` |


