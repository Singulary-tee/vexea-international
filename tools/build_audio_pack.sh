#!/usr/bin/env bash
# Builds the first-pass VEXEA audio library from license-verified source archives.
# Output is intentionally staged outside the repository's public tree for R2 upload.
set -euo pipefail

ROOT="/home/ubuntu/vexea"
SRC="$ROOT/audio_sources"
OUT="$ROOT/audio_staging"

rm -rf "$OUT"
mkdir -p "$OUT/Audio/Sfx/Weapons" "$OUT/Audio/Sfx/Utility" "$OUT/Audio/Sfx/Locomotion" \
  "$OUT/Audio/Sfx/Drones" "$OUT/Audio/Sfx/UI" "$OUT/Audio/Sfx/Player" \
  "$OUT/Audio/Sfx/Commander" "$OUT/Audio/Ambient" "$OUT/Audio/Music"

# Args: source, output relative to OUT, routing profile, optional FFmpeg filter suffix.
# World cues are monophonic so a PannerNode/THREE.PositionalAudio can position them accurately.
# UI/music/ambient paths retain stereo. All output uses Opus within an Ogg-compatible container.
encode() {
  local source="$1"
  local relative="$2"
  local profile="$3"
  local suffix="${4:-}"
  local channels bitrate target_lufs

  case "$profile" in
    world)   channels=1; bitrate=64k;  target_lufs=-18 ;;
    ui)      channels=2; bitrate=48k;  target_lufs=-20 ;;
    ambient) channels=2; bitrate=80k;  target_lufs=-25 ;;
    music)   channels=2; bitrate=128k; target_lufs=-18 ;;
    *) echo "Unknown audio profile: $profile" >&2; exit 1 ;;
  esac

  mkdir -p "$(dirname "$OUT/$relative")"
  local filter="loudnorm=I=${target_lufs}:LRA=11:TP=-1.5,alimiter=limit=0.95"
  if [[ -n "$suffix" ]]; then
    filter="$filter,$suffix"
  fi

  ffmpeg -y -v error -i "$source" -vn -ar 48000 -ac "$channels" -af "$filter" \
    -c:a libopus -application audio -vbr on -compression_level 10 -b:a "$bitrate" \
    "$OUT/$relative"
}

FIRE="$SRC/firearm_cc0/selected/Prepared SFX Library"
EXP="$SRC/cc0_explosion_mechanical"
GEN="$SRC/cc0_utility_ambience"
LOOPS="$SRC/cc0_loops"
FSTEP="$SRC/footsteps_cc0/Fantozzi-footsteps/ogg"
MULTI="$SRC/footsteps_multisurface/footsteps"

# Weapons: distinct discharge signatures for player, humanoid, UGV, and rifle-quadcopter roles.
encode "$FIRE/1911/A_42P.wav"                 "Audio/Sfx/Weapons/pistol_fire.opus"            world "atrim=0:2.40"
encode "$FIRE/AK-47/C_28P.wav"                "Audio/Sfx/Weapons/rifle_fire.opus"             world "atrim=0:2.40"
encode "$FIRE/PPSh/P_30P.wav"                 "Audio/Sfx/Weapons/smg_fire.opus"               world "atrim=0:2.4"
encode "$FIRE/SKS/U_14P.wav"                  "Audio/Sfx/Drones/humanoid_gun_fire.opus"       world "atrim=0:2.0"
encode "$FIRE/AK-47/C_28P.wav"                "Audio/Sfx/Drones/ugv_turret_fire.opus"         world "atrim=0:1.70,atempo=0.90"
encode "$FIRE/Ruger Mark III/R_35P.wav"       "Audio/Sfx/Drones/quadcopter_rifle_fire.opus"   world "atrim=0:1.4"
encode "$GEN/sfx100v2_switch_01.ogg"          "Audio/Sfx/Weapons/empty_click.opus"            ui "atrim=0:0.34"
encode "$GEN/sfx100v2_metal_01.ogg"           "Audio/Sfx/Weapons/ads.opus"                    ui "atrim=0:0.40"
encode "$EXP/metal_02.ogg"                    "Audio/Sfx/Weapons/reload.opus"                 ui "atrim=0:0.70"

# Utilities: action/result pairs where the gameplay interaction needs both cues.
encode "$GEN/sfx100v2_items_01.ogg"           "Audio/Sfx/Utility/grenade_throw.opus"          world "atrim=0:0.65"
encode "$EXP/explosion.ogg"                    "Audio/Sfx/Utility/grenade_explosion.opus"      world
encode "$GEN/sfx100v2_metal_02.ogg"           "Audio/Sfx/Utility/flashbang_throw.opus"        world "atrim=0:0.55"
encode "$GEN/sfx100v2_thunder_01.ogg"         "Audio/Sfx/Utility/flashbang_detonate.opus"     world "atrim=0:0.90"
encode "$EXP/tools_01.ogg"                    "Audio/Sfx/Utility/c4_place.opus"               world "atrim=0:0.80"
encode "$EXP/explosion.ogg"                    "Audio/Sfx/Utility/c4_detonate.opus"            world "atempo=0.78"
encode "$EXP/metal_05.ogg"                    "Audio/Sfx/Utility/mine_deploy.opus"            world "atrim=0:0.70"
encode "$GEN/sfx100v2_switch_02.ogg"          "Audio/Sfx/Utility/mine_trigger.opus"           world "atrim=0:0.55"
encode "$EXP/tools_03.ogg"                    "Audio/Sfx/Utility/jammer_deploy.opus"          world "atrim=0:0.70"
encode "$LOOPS/weird_02.ogg"                  "Audio/Sfx/Utility/jammer_active_loop.opus"     world
encode "$GEN/sfx100v2_items_02.ogg"           "Audio/Sfx/Utility/revive_start.opus"           world "atrim=0:0.95"
encode "$GEN/sfx100v2_loop_water_01.ogg"      "Audio/Sfx/Utility/revive_complete.opus"        world "atrim=0:1.10"

# Player feedback and HUD/interface. The existing R2 click is retained separately as ui_click.
encode "$GEN/sfx100v2_glass_02.ogg"           "Audio/Sfx/Player/damage_light.opus"            ui "atrim=0:0.42"
encode "$GEN/sfx100v2_glass_04.ogg"           "Audio/Sfx/Player/damage_heavy.opus"            ui "atrim=0:0.58,atempo=0.82"
encode "$GEN/sfx100v2_hit_02.ogg"             "Audio/Sfx/Player/hit_confirm.opus"             ui "atrim=0:0.28"
encode "$GEN/sfx100v2_air_02.ogg"             "Audio/Sfx/Player/quick_turn.opus"              ui "atrim=0:0.36"
encode "$GEN/sfx100v2_switch_01.ogg"          "Audio/Sfx/UI/join_match.opus"                  ui "atrim=0:0.60"
encode "$EXP/gong_01.ogg"                     "Audio/Sfx/UI/match_end_motif.opus"             ui "atrim=0:1.50"
encode "$EXP/bell_02.ogg"                     "Audio/Sfx/UI/level_up.opus"                    ui "atrim=0:1.10"
encode "$GEN/sfx100v2_items_02.ogg"           "Audio/Sfx/UI/credits_gain.opus"                ui "atrim=0:0.55"
encode "$GEN/sfx100v2_items_01.ogg"           "Audio/Sfx/UI/credits_spend.opus"               ui "atrim=0:0.48,atempo=0.82"
encode "$GEN/sfx100v2_switch_02.ogg"          "Audio/Sfx/UI/notification.opus"                ui "atrim=0:0.45"

# Movement: separate surface families. Running cues are intentional derived variations.
encode "$FSTEP/Fantozzi-StoneL1.ogg"          "Audio/Sfx/Locomotion/walk_hard_01.opus"        world
encode "$FSTEP/Fantozzi-StoneR1.ogg"          "Audio/Sfx/Locomotion/walk_hard_02.opus"        world
encode "$FSTEP/Fantozzi-StoneL2.ogg"          "Audio/Sfx/Locomotion/run_hard_01.opus"         world "atempo=1.14"
encode "$FSTEP/Fantozzi-StoneR2.ogg"          "Audio/Sfx/Locomotion/run_hard_02.opus"         world "atempo=1.14"
encode "$FSTEP/Fantozzi-SandL1.ogg"           "Audio/Sfx/Locomotion/walk_ground_01.opus"      world
encode "$FSTEP/Fantozzi-SandR1.ogg"           "Audio/Sfx/Locomotion/walk_ground_02.opus"      world
encode "$FSTEP/Fantozzi-SandL2.ogg"           "Audio/Sfx/Locomotion/run_ground_01.opus"       world "atempo=1.14"
encode "$FSTEP/Fantozzi-SandR2.ogg"           "Audio/Sfx/Locomotion/run_ground_02.opus"       world "atempo=1.14"
encode "$MULTI/gravel/0.ogg"                  "Audio/Sfx/Locomotion/walk_gravel_01.opus"      world
encode "$MULTI/gravel/1.ogg"                  "Audio/Sfx/Locomotion/walk_gravel_02.opus"      world
encode "$MULTI/gravel/2.ogg"                  "Audio/Sfx/Locomotion/run_gravel_01.opus"       world "atempo=1.14"
encode "$MULTI/gravel/3.ogg"                  "Audio/Sfx/Locomotion/run_gravel_02.opus"       world "atempo=1.14"
encode "$MULTI/metal/0.ogg"                   "Audio/Sfx/Locomotion/walk_metal_01.opus"       world
encode "$MULTI/metal/1.ogg"                   "Audio/Sfx/Locomotion/walk_metal_02.opus"       world
encode "$MULTI/metal/2.ogg"                   "Audio/Sfx/Locomotion/run_metal_01.opus"        world "atempo=1.14"
encode "$MULTI/metal/3.ogg"                   "Audio/Sfx/Locomotion/run_metal_02.opus"        world "atempo=1.14"
encode "$GEN/sfx100v2_footstep_wood_01.ogg"   "Audio/Sfx/Locomotion/walk_wood_01.opus"        world
encode "$GEN/sfx100v2_footstep_wood_02.ogg"   "Audio/Sfx/Locomotion/walk_wood_02.opus"        world
encode "$GEN/sfx100v2_footstep_wood_03.ogg"   "Audio/Sfx/Locomotion/run_wood_01.opus"         world "atempo=1.14"
encode "$GEN/sfx100v2_footstep_wood_04.ogg"   "Audio/Sfx/Locomotion/run_wood_02.opus"         world "atempo=1.14"
encode "$GEN/sfx100v2_metal_05.ogg"           "Audio/Sfx/Locomotion/crouch.opus"              world "atrim=0:0.45"
encode "$GEN/sfx100v2_air_01.ogg"             "Audio/Sfx/Locomotion/jump.opus"                world "atrim=0:0.35"
encode "$GEN/sfx100v2_hit_03.ogg"             "Audio/Sfx/Locomotion/land.opus"                world "atrim=0:0.35"

# Drone movement and situational signals. Quadcopter variants share one rotor base at different pitch layers.
encode "$LOOPS/machine_08.ogg"                "Audio/Sfx/Drones/quadcopter_rotor_idle.opus"   world
encode "$LOOPS/machine_08.ogg"                "Audio/Sfx/Drones/quadcopter_rotor_fast.opus"   world "atempo=1.18"
encode "$LOOPS/machine_08.ogg"                "Audio/Sfx/Drones/quadcopter_rotor_distant.opus" world "atempo=0.86"
encode "$LOOPS/alarm_02.ogg"                  "Audio/Sfx/Drones/bomber_lock.opus"             world
encode "$EXP/explosion.ogg"                    "Audio/Sfx/Drones/bomber_explosion.opus"        world "atempo=0.78"
encode "$LOOPS/weird_01.ogg"                  "Audio/Sfx/Drones/recon_scan_loop.opus"         world
encode "$LOOPS/machine_11.ogg"                 "Audio/Sfx/Drones/ugv_engine_loop.opus"         world
encode "$LOOPS/noise_01.ogg"                  "Audio/Sfx/Drones/uav_flight_loop.opus"         world
encode "$MULTI/mech/0.ogg"                    "Audio/Sfx/Drones/quadruped_step.opus"          world
encode "$MULTI/mech/0.ogg"                    "Audio/Sfx/Drones/humanoid_mechanical_step.opus" world "atempo=0.90"
encode "$EXP/metal_08.ogg"                    "Audio/Sfx/Drones/robot_dog_servo.opus"         world "atrim=0:0.75"
encode "$EXP/machine_02.ogg"                  "Audio/Sfx/Drones/humanoid_servo.opus"          world "atrim=0:0.75"

# Commander and ambience. These are deliberately restrained source layers rather than spoken voice.
encode "$LOOPS/weird_03.ogg"                  "Audio/Sfx/Commander/tracking_deep_loop.opus"   ambient "atempo=0.70"
encode "$LOOPS/ambient_01.ogg"                "Audio/Ambient/exterior_base_loop.opus"          ambient
encode "$GEN/sfx100v2_loop_ambient_02.ogg"    "Audio/Ambient/interior_base_loop.opus"          ambient
encode "$GEN/sfx100v2_air_03.ogg"             "Audio/Ambient/wind_detail.opus"                 ambient
encode "$GEN/sfx100v2_loop_construction_site.ogg" "Audio/Ambient/distant_industrial_loop.opus"  ambient

# Third track: CC0 candidate for review alongside vexea_theme and iron_march.
encode "$SRC/music_cc0/Factory.ogg"           "Audio/Music/factory_ambience.opus"              music

printf 'Built %s staged files in %s\n' "$(find "$OUT/Audio" -type f | wc -l)" "$OUT"
