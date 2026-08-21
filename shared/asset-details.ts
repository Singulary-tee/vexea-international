import type { UtilityId } from './utilities';
import type { WeaponId } from './weapons';

export type WeaponSlot = 'primary' | 'secondary';

export interface WeaponAssetDetails {
  modelKey: string;
  svgPath: string;
  audio: {
    fire: string;
    reload: string;
  };
  animations: {
    idle: string;
    walk: string;
    shoot: string;
    reload: string;
    draw: string;
  };
  authored: boolean;
}

/**
 * Runtime asset contract for weapon identity. Model, audio, SVG, and authored
 * animation work are intentionally named here so downstream agents can attach
 * real assets without duplicating keys in render, HUD, or input systems.
 */
export const WEAPON_ASSET_DETAILS: Record<WeaponId, WeaponAssetDetails> = {
  rifle: {
    modelKey: 'scar_l-optimized.glb',
    svgPath: '/ui_svgs/rifle.svg',
    audio: { fire: 'rifle_fire', reload: 'rifle_reload' },
    animations: {
      idle: 'Rig|KDW_DPose_Idle',
      walk: 'Rig|KDW_Walk',
      shoot: 'Rig|KDW_Shot',
      reload: 'Rig|KDW_Reload_fast',
      draw: 'Rig|KDW_Draw',
    },
    authored: true,
  },
  pistol: {
    modelKey: 'g17-optimized.glb',
    svgPath: '/ui_svgs/pistol.svg',
    audio: { fire: 'pistol_fire', reload: 'pistol_reload' },
    animations: {
      idle: 'idle',
      walk: 'walk',
      shoot: 'shoot',
      reload: 'reload',
      draw: 'draw',
    },
    authored: true,
  },
  smg: {
    modelKey: 'f_90-optimized.glb',
    svgPath: '/ui_svgs/smg.svg',
    audio: { fire: 'smg_fire', reload: 'PLACEHOLDER_SMG_RELOAD' },
    animations: {
      idle: 'PLACEHOLDER_SMG_IDLE',
      walk: 'PLACEHOLDER_SMG_WALK',
      shoot: 'PLACEHOLDER_SMG_SHOOT',
      reload: 'PLACEHOLDER_SMG_RELOAD',
      draw: 'PLACEHOLDER_SMG_DRAW',
    },
    authored: false,
  },
  shotgun: {
    modelKey: 'benelli-m4-optimized.glb',
    svgPath: '/ui_svgs/shotgun.svg',
    audio: { fire: 'PLACEHOLDER_SHOTGUN_FIRE', reload: 'PLACEHOLDER_SHOTGUN_RELOAD' },
    animations: {
      idle: 'PLACEHOLDER_SHOTGUN_IDLE',
      walk: 'PLACEHOLDER_SHOTGUN_WALK',
      shoot: 'PLACEHOLDER_SHOTGUN_SHOOT',
      reload: 'PLACEHOLDER_SHOTGUN_RELOAD',
      draw: 'PLACEHOLDER_SHOTGUN_DRAW',
    },
    authored: false,
  },
  lmg: {
    modelKey: 'lmg-rifle-optimized.glb',
    svgPath: '/ui_svgs/lmg.svg',
    audio: { fire: 'PLACEHOLDER_LMG_FIRE', reload: 'PLACEHOLDER_LMG_RELOAD' },
    animations: {
      idle: 'PLACEHOLDER_LMG_IDLE',
      walk: 'PLACEHOLDER_LMG_WALK',
      shoot: 'PLACEHOLDER_LMG_SHOOT',
      reload: 'PLACEHOLDER_LMG_RELOAD',
      draw: 'PLACEHOLDER_LMG_DRAW',
    },
    authored: false,
  },
  sniper: {
    modelKey: 'pgm-ultima-ratio-optimized.glb',
    svgPath: '/ui_svgs/sniper.svg',
    audio: { fire: 'PLACEHOLDER_SNIPER_FIRE', reload: 'PLACEHOLDER_SNIPER_RELOAD' },
    animations: {
      idle: 'PLACEHOLDER_SNIPER_IDLE',
      walk: 'PLACEHOLDER_SNIPER_WALK',
      shoot: 'PLACEHOLDER_SNIPER_SHOOT',
      reload: 'PLACEHOLDER_SNIPER_RELOAD',
      draw: 'PLACEHOLDER_SNIPER_DRAW',
    },
    authored: false,
  },
};

export interface UtilityAssetDetails {
  modelKey: string;
  svgPath: string;
  audioUseKey: string;
  animationUseKey: string;
}

/**
 * AUDIO CONNECTOR PLACEHOLDER: audio-responsible agent should replace only
 * placeholder utility sound keys after the final audio manifest is authored.
 * SVG CONNECTOR PLACEHOLDER: svg-responsible agent should replace only the
 * paths below when utility icon assets are finalized.
 */
export const UTILITY_ASSET_DETAILS: Record<UtilityId, UtilityAssetDetails> = {
  'Grenade': { modelKey: 'm67-grenade-optimized.glb', svgPath: '/ui_svgs/utility_grenade.svg', audioUseKey: 'PLACEHOLDER_GRENADE_USE', animationUseKey: 'PLACEHOLDER_GRENADE_THROW' },
  'Flashbang': { modelKey: 'm84-flashbang-optimized.glb', svgPath: '/ui_svgs/utility_flashbang.svg', audioUseKey: 'PLACEHOLDER_FLASHBANG_USE', animationUseKey: 'PLACEHOLDER_FLASHBANG_THROW' },
  'Med Kit': { modelKey: 'emergency-medkit-optimized.glb', svgPath: '/ui_svgs/medkit.svg', audioUseKey: 'PLACEHOLDER_MEDKIT_USE', animationUseKey: 'PLACEHOLDER_MEDKIT_USE' },
  'Revive Tool': { modelKey: 'healthshot-optimized.glb', svgPath: '/ui_svgs/utility_revive.svg', audioUseKey: 'PLACEHOLDER_REVIVE_USE', animationUseKey: 'PLACEHOLDER_REVIVE_STAB_PRESS' },
  'Radio': { modelKey: 'selex-prr-optimized.glb', svgPath: '/ui_svgs/radio.svg', audioUseKey: 'PLACEHOLDER_RADIO_USE', animationUseKey: 'PLACEHOLDER_RADIO_CALL' },
  'Signal Jammer': { modelKey: 'prc152-optimized.glb', svgPath: '/ui_svgs/utility_jammer.svg', audioUseKey: 'PLACEHOLDER_SIGNAL_JAMMER_USE', animationUseKey: 'PLACEHOLDER_SIGNAL_JAMMER_USE' },
  'Proximity Mine': { modelKey: 'proximity-mine-optimized.glb', svgPath: '/ui_svgs/utility_mine.svg', audioUseKey: 'PLACEHOLDER_PROXIMITY_MINE_USE', animationUseKey: 'PLACEHOLDER_PROXIMITY_MINE_DEPLOY' },
  'C4': { modelKey: 'c4-optimized.glb', svgPath: '/ui_svgs/utility_c4.svg', audioUseKey: 'PLACEHOLDER_C4_USE', animationUseKey: 'PLACEHOLDER_C4_PLACE' },
};
