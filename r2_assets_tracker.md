# VEXEA Cloudflare R2 Assets Tracker

> [!WARNING]
> **CRITICAL REPOSITORY RULE (DISCLAIMER):**
> This Asset Tracker is exclusively for the new Cloudflare R2 bucket (`https://vexea-r2-asset-guard.alte.workers.dev`). 
> We are slowly phasing out GitHub Releases and Filebase. Large media files **do not belong in this codebase repository**.
> All heavy assets MUST be hosted in the R2 bucket and dynamically retrieved by the client loading sequence.

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

## 2. Audio Assets (Canonical R2 inventory)

All audio is now hosted in R2 and resolved through the client manifest in `client/audio-manifest.ts`. The 75 non-empty objects below were verified in `vexea-international-bucket` on 2026-08-13. Every payload uses the `.opus` extension and was uploaded with `audio/ogg` metadata. The zero-byte directory-marker objects (`Audio/`, `Audio/Music/`, and `Audio/Sfx/`) are not audio assets.

| Audio Path | Role |
| :--- | :--- |
| `Audio/Ambient/distant_industrial_loop.opus` | Distant industrial ambience |
| `Audio/Ambient/exterior_base_loop.opus` | Exterior ambience |
| `Audio/Ambient/interior_base_loop.opus` | Interior ambience |
| `Audio/Ambient/wind_detail.opus` | Wind detail loop |
| `Audio/Music/factory_ambience.opus` | Third music track |
| `Audio/Music/iron_march.opus` | Existing music track |
| `Audio/Music/vexea_theme.opus` | Existing theme track |
| `Audio/Sfx/Commander/tracking_deep_loop.opus` | LLM commander tracking layer |
| `Audio/Sfx/Drones/bomber_explosion.opus` | Bomber/explosion cue |
| `Audio/Sfx/Drones/bomber_lock.opus` | Bomber lock-on cue |
| `Audio/Sfx/Drones/humanoid_gun_fire.opus` | Humanoid drone weapon |
| `Audio/Sfx/Drones/humanoid_mechanical_step.opus` | Humanoid mechanical movement |
| `Audio/Sfx/Drones/humanoid_servo.opus` | Humanoid servo detail |
| `Audio/Sfx/Drones/quadcopter_rifle_fire.opus` | Rifle quadcopter weapon |
| `Audio/Sfx/Drones/quadcopter_rotor_distant.opus` | Distant quadcopter rotor |
| `Audio/Sfx/Drones/quadcopter_rotor_fast.opus` | Fast quadcopter rotor |
| `Audio/Sfx/Drones/quadcopter_rotor_idle.opus` | Idle quadcopter rotor |
| `Audio/Sfx/Drones/quadruped_step.opus` | Quadruped movement |
| `Audio/Sfx/Drones/recon_scan_loop.opus` | Recon scan loop |
| `Audio/Sfx/Drones/robot_dog_servo.opus` | Robot-dog servo detail |
| `Audio/Sfx/Drones/uav_flight_loop.opus` | UAV/fixed-wing flight loop |
| `Audio/Sfx/Drones/ugv_engine_loop.opus` | UGV engine loop |
| `Audio/Sfx/Drones/ugv_turret_fire.opus` | UGV turret weapon |
| `Audio/Sfx/Locomotion/crouch.opus` | Crouch cue |
| `Audio/Sfx/Locomotion/jump.opus` | Jump cue |
| `Audio/Sfx/Locomotion/land.opus` | Landing cue |
| `Audio/Sfx/Locomotion/run_gravel_01.opus` | Gravel running variation 1 |
| `Audio/Sfx/Locomotion/run_gravel_02.opus` | Gravel running variation 2 |
| `Audio/Sfx/Locomotion/run_ground_01.opus` | Ground running variation 1 |
| `Audio/Sfx/Locomotion/run_ground_02.opus` | Ground running variation 2 |
| `Audio/Sfx/Locomotion/run_hard_01.opus` | Hard-surface running variation 1 |
| `Audio/Sfx/Locomotion/run_hard_02.opus` | Hard-surface running variation 2 |
| `Audio/Sfx/Locomotion/run_metal_01.opus` | Metal running variation 1 |
| `Audio/Sfx/Locomotion/run_metal_02.opus` | Metal running variation 2 |
| `Audio/Sfx/Locomotion/run_wood_01.opus` | Wood running variation 1 |
| `Audio/Sfx/Locomotion/run_wood_02.opus` | Wood running variation 2 |
| `Audio/Sfx/Locomotion/walk_gravel_01.opus` | Gravel walking variation 1 |
| `Audio/Sfx/Locomotion/walk_gravel_02.opus` | Gravel walking variation 2 |
| `Audio/Sfx/Locomotion/walk_ground_01.opus` | Ground walking variation 1 |
| `Audio/Sfx/Locomotion/walk_ground_02.opus` | Ground walking variation 2 |
| `Audio/Sfx/Locomotion/walk_hard_01.opus` | Hard-surface walking variation 1 |
| `Audio/Sfx/Locomotion/walk_hard_02.opus` | Hard-surface walking variation 2 |
| `Audio/Sfx/Locomotion/walk_metal_01.opus` | Metal walking variation 1 |
| `Audio/Sfx/Locomotion/walk_metal_02.opus` | Metal walking variation 2 |
| `Audio/Sfx/Locomotion/walk_wood_01.opus` | Wood walking variation 1 |
| `Audio/Sfx/Locomotion/walk_wood_02.opus` | Wood walking variation 2 |
| `Audio/Sfx/Player/damage_heavy.opus` | Heavy player damage |
| `Audio/Sfx/Player/damage_light.opus` | Light player damage |
| `Audio/Sfx/Player/hit_confirm.opus` | Hit confirmation |
| `Audio/Sfx/Player/quick_turn.opus` | Quick-turn detail |
| `Audio/Sfx/UI/credits_gain.opus` | Credits/energy gain |
| `Audio/Sfx/UI/credits_spend.opus` | Credits/energy spend |
| `Audio/Sfx/UI/join_match.opus` | Join-match feedback |
| `Audio/Sfx/UI/level_up.opus` | Level-up feedback |
| `Audio/Sfx/UI/match_end_motif.opus` | Match-end motif |
| `Audio/Sfx/UI/notification.opus` | Generic notification |
| `Audio/Sfx/Utility/c4_detonate.opus` | C4 detonation |
| `Audio/Sfx/Utility/c4_place.opus` | C4 placement |
| `Audio/Sfx/Utility/flashbang_detonate.opus` | Flashbang detonation |
| `Audio/Sfx/Utility/flashbang_throw.opus` | Flashbang throw |
| `Audio/Sfx/Utility/grenade_explosion.opus` | Grenade explosion |
| `Audio/Sfx/Utility/grenade_throw.opus` | Grenade throw |
| `Audio/Sfx/Utility/jammer_active_loop.opus` | Jammer active loop |
| `Audio/Sfx/Utility/jammer_deploy.opus` | Jammer deployment |
| `Audio/Sfx/Utility/mine_deploy.opus` | Mine deployment |
| `Audio/Sfx/Utility/mine_trigger.opus` | Mine trigger |
| `Audio/Sfx/Utility/revive_complete.opus` | Revive completion |
| `Audio/Sfx/Utility/revive_start.opus` | Revive start |
| `Audio/Sfx/Weapons/ads.opus` | ADS feedback |
| `Audio/Sfx/Weapons/empty_click.opus` | Out-of-ammo click |
| `Audio/Sfx/Weapons/pistol_fire.opus` | Player pistol fire |
| `Audio/Sfx/Weapons/reload.opus` | Generic reload |
| `Audio/Sfx/Weapons/rifle_fire.opus` | Player rifle fire |
| `Audio/Sfx/Weapons/smg_fire.opus` | Player SMG fire |
| `Audio/Sfx/click.opus` | Generic interface click |

### Audio source and integration rules

The audio manifest is the only client-side source of truth for audio keys, file paths, categories, and looping behavior. `client/audio.ts` loads the manifest and requests canonical R2 paths. `client/asset-cache.ts` routes every `Sound` request to the R2 asset guard and no longer uses the GitHub Sound release as a fallback. New audio must be added to R2, then to `client/audio-manifest.ts`, and finally to this tracker; legacy GitHub-only names must not be reintroduced.

Positional playback uses listener-relative stereo panning derived from the active camera’s right vector and quadratic distance attenuation. UI, music, and ambience remain non-positional unless a future feature explicitly adds a separate spatial mix policy.

## 3. Remaining audio integration work

The R2 library and canonical client resolution are complete. Remaining integration work includes wiring event-specific utility/UI cues at their gameplay call sites, emitting jump/crouch/land/damage cues from the player state transitions, connecting drone loop lifecycle to spawned drone entities, and adding an explicit interior/exterior mix controller. Adaptive music stems and more elaborate commander voice behavior remain out of scope for this pass.
