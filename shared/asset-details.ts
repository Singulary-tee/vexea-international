import type { UtilityId } from './utilities';
import type { WeaponId } from './weapons';

export type WeaponSlot = 'primary' | 'secondary';

export interface WeaponAnimationContract {
  nodes: {
    root: string;
    gripPrimary: string;
    gripSupport: string;
    muzzle: string;
    adsReference: string;
    magazine?: string;
  };
  clips: {
    idle: string;
    sprint: string;
    fire: string;
    reload: string;
    equip: string;
    inspect: string;
    adsEnter: string;
    adsHold: string;
    adsExit: string;
  };
  markers: Readonly<Record<string, number>>;
  measuredSize: readonly [number, number, number];
}

export interface WeaponAssetDetails {
  modelKey: string;
  svgPath: string;
  audio: {
    fire: string;
    reload: string;
  };
  /** Compatibility aliases for the current internal action keys. */
  animations: {
    idle: string;
    walk: string;
    shoot: string;
    reload: string;
    draw: string;
  };
  animation: WeaponAnimationContract | null;
  authored: boolean;
}

const STANDARD_WEAPON_CLIPS: WeaponAnimationContract['clips'] = {
  idle: 'idle',
  sprint: 'sprint',
  fire: 'fire',
  reload: 'reload',
  equip: 'equip',
  inspect: 'inspect',
  adsEnter: 'ads_enter',
  adsHold: 'ads_hold',
  adsExit: 'ads_exit',
};

const STANDARD_WEAPON_MARKERS: Readonly<Record<string, number>> = {
  equip_complete: 18,
  ads_ready: 12,
  ads_clear: 24,
  fire: 3,
  muzzle: 3,
  reload_start: 1,
  magazine_out: 12,
  magazine_in: 24,
  reload_complete: 30,
};

function createWeaponAnimationContract(
  measuredSize: readonly [number, number, number],
  magazine: boolean,
): WeaponAnimationContract {
  return {
    nodes: {
      root: 'WeaponRoot',
      gripPrimary: 'GripPrimary',
      gripSupport: 'GripSupport',
      muzzle: 'Muzzle',
      adsReference: 'ADSReference',
      ...(magazine ? { magazine: 'Magazine' } : {}),
    },
    clips: STANDARD_WEAPON_CLIPS,
    markers: magazine
      ? STANDARD_WEAPON_MARKERS
      : {
          equip_complete: 18,
          ads_ready: 12,
          ads_clear: 24,
          fire: 3,
          muzzle: 3,
          reload_start: 1,
          reload_complete: 30,
        },
    measuredSize,
  };
}

function createCompatibilityAnimationAliases(animation: WeaponAnimationContract): WeaponAssetDetails['animations'] {
  return {
    idle: animation.clips.idle,
    walk: animation.clips.sprint,
    shoot: animation.clips.fire,
    reload: animation.clips.reload,
    draw: animation.clips.equip,
  };
}

const RIFLE_ANIMATION = createWeaponAnimationContract([78.764503, 7.600975, 25.293276], true);
const PISTOL_ANIMATION = createWeaponAnimationContract([0.03113, 0.293643, 0.158911], true);
const LMG_ANIMATION = createWeaponAnimationContract([2.140608, 19.06014, 5.112448], true);
const SHOTGUN_ANIMATION = createWeaponAnimationContract([1.18001, 4.159216, 0.845963], false);
const SNIPER_ANIMATION = createWeaponAnimationContract([4.98094, 0.80619, 1.400133], true);

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
    animations: createCompatibilityAnimationAliases(RIFLE_ANIMATION),
    animation: RIFLE_ANIMATION,
    authored: true,
  },
  pistol: {
    modelKey: 'g17-optimized.glb',
    svgPath: '/ui_svgs/pistol.svg',
    audio: { fire: 'pistol_fire', reload: 'pistol_reload' },
    animations: createCompatibilityAnimationAliases(PISTOL_ANIMATION),
    animation: PISTOL_ANIMATION,
    authored: true,
  },
  smg: {
    modelKey: 'f_90-optimized.glb',
    svgPath: '/ui_svgs/smg.svg',
    audio: { fire: 'smg_fire', reload: 'PLACEHOLDER_SMG_RELOAD' },
    animations: {
      idle: 'PLACEHOLDER_SMG_IDLE',
      walk: 'PLACEHOLDER_SMG_SPRINT',
      shoot: 'PLACEHOLDER_SMG_FIRE',
      reload: 'PLACEHOLDER_SMG_RELOAD',
      draw: 'PLACEHOLDER_SMG_EQUIP',
    },
    animation: null,
    authored: false,
  },
  shotgun: {
    modelKey: 'benelli-m4-optimized.glb',
    svgPath: '/ui_svgs/shotgun.svg',
    audio: { fire: 'PLACEHOLDER_SHOTGUN_FIRE', reload: 'PLACEHOLDER_SHOTGUN_RELOAD' },
    animations: createCompatibilityAnimationAliases(SHOTGUN_ANIMATION),
    animation: SHOTGUN_ANIMATION,
    authored: true,
  },
  lmg: {
    modelKey: 'lmg-rifle-optimized.glb',
    svgPath: '/ui_svgs/lmg.svg',
    audio: { fire: 'PLACEHOLDER_LMG_FIRE', reload: 'PLACEHOLDER_LMG_RELOAD' },
    animations: createCompatibilityAnimationAliases(LMG_ANIMATION),
    animation: LMG_ANIMATION,
    authored: true,
  },
  sniper: {
    modelKey: 'pgm-ultima-ratio-optimized.glb',
    svgPath: '/ui_svgs/sniper.svg',
    audio: { fire: 'PLACEHOLDER_SNIPER_FIRE', reload: 'PLACEHOLDER_SNIPER_RELOAD' },
    animations: createCompatibilityAnimationAliases(SNIPER_ANIMATION),
    animation: SNIPER_ANIMATION,
    authored: true,
  },
};

export interface UtilityAnimationContract {
  nodes: {
    root: string;
    usePoint: string;
    placementReference: string;
    throwRelease: string;
  };
  clips: {
    equip: string;
    idle: string;
    inspect: string;
    use?: string;
    throw?: string;
    place?: string;
  };
  markers: Readonly<Record<string, number>>;
  measuredSize: readonly [number, number, number];
}

export interface UtilityAssetDetails {
  modelKey: string;
  svgPath: string;
  audioUseKey: string;
  animationUseKey: string;
  animation: UtilityAnimationContract | null;
  authored: boolean;
}

function createUtilityAnimationContract(
  action: 'use' | 'throw' | 'place',
  measuredSize: readonly [number, number, number],
  markers: Readonly<Record<string, number>>,
): UtilityAnimationContract {
  return {
    nodes: {
      root: 'UtilityRoot',
      usePoint: 'UtilityUsePoint',
      placementReference: 'PlacementReference',
      throwRelease: 'ThrowRelease',
    },
    clips: {
      equip: 'equip',
      idle: 'idle',
      inspect: 'inspect',
      [action]: action,
    },
    markers,
    measuredSize,
  };
}

/**
 * AUDIO CONNECTOR PLACEHOLDER: audio-responsible agent should replace only
 * placeholder utility sound keys after the final audio manifest is authored.
 * SVG CONNECTOR PLACEHOLDER: svg-responsible agent should replace only the
 * paths below when utility icon assets are finalized.
 */
export const UTILITY_ASSET_DETAILS: Record<UtilityId, UtilityAssetDetails> = {
  'Grenade': {
    modelKey: 'm67-grenade-optimized.glb',
    svgPath: '/ui_svgs/utility_grenade.svg',
    audioUseKey: 'PLACEHOLDER_GRENADE_USE',
    animationUseKey: 'PLACEHOLDER_GRENADE_THROW',
    animation: createUtilityAnimationContract('throw', [0.05957, 0.064784, 0.088684], { equip_complete: 18, throw_release: 30, throw_complete: 42 }),
    authored: true,
  },
  'Flashbang': {
    modelKey: 'm84-flashbang-optimized.glb',
    svgPath: '/ui_svgs/utility_flashbang.svg',
    audioUseKey: 'PLACEHOLDER_FLASHBANG_USE',
    animationUseKey: 'PLACEHOLDER_FLASHBANG_THROW',
    animation: createUtilityAnimationContract('throw', [0.089401, 0.060664, 0.183471], { equip_complete: 18, throw_release: 30, throw_complete: 42 }),
    authored: true,
  },
  'Med Kit': {
    modelKey: 'emergency-medkit-optimized.glb',
    svgPath: '/ui_svgs/medkit.svg',
    audioUseKey: 'PLACEHOLDER_MEDKIT_USE',
    animationUseKey: 'PLACEHOLDER_MEDKIT_USE',
    animation: createUtilityAnimationContract('use', [0.694197, 0.653067, 0.700505], { equip_complete: 18, use_start: 1, use_commit: 16, use_complete: 40 }),
    authored: true,
  },
  'Revive Tool': {
    modelKey: 'healthshot-optimized.glb',
    svgPath: '/ui_svgs/utility_revive.svg',
    audioUseKey: 'PLACEHOLDER_REVIVE_USE',
    animationUseKey: 'PLACEHOLDER_REVIVE_STAB_PRESS',
    animation: createUtilityAnimationContract('use', [0.266678, 0.047595, 0.060812], { equip_complete: 18, use_start: 1, use_commit: 15, use_complete: 32 }),
    authored: true,
  },
  'Radio': {
    modelKey: 'selex-prr-optimized.glb',
    svgPath: '/ui_svgs/radio.svg',
    audioUseKey: 'PLACEHOLDER_RADIO_USE',
    animationUseKey: 'PLACEHOLDER_RADIO_CALL',
    animation: createUtilityAnimationContract('use', [2.100569, 0.864385, 3.852933], { equip_complete: 18, use_start: 1, use_commit: 12, use_complete: 36 }),
    authored: true,
  },
  'Signal Jammer': {
    modelKey: 'prc152-optimized.glb',
    svgPath: '/ui_svgs/utility_jammer.svg',
    audioUseKey: 'PLACEHOLDER_SIGNAL_JAMMER_USE',
    animationUseKey: 'PLACEHOLDER_SIGNAL_JAMMER_USE',
    animation: createUtilityAnimationContract('use', [137.714355, 73.566498, 695.084595], { equip_complete: 18, use_start: 1, use_commit: 12, use_complete: 36 }),
    authored: true,
  },
  'Proximity Mine': {
    modelKey: 'proximity-mine-optimized.glb',
    svgPath: '/ui_svgs/utility_mine.svg',
    audioUseKey: 'PLACEHOLDER_PROXIMITY_MINE_USE',
    animationUseKey: 'PLACEHOLDER_PROXIMITY_MINE_DEPLOY',
    animation: createUtilityAnimationContract('place', [202.469711, 202.469742, 115.684662], { equip_complete: 18, place_commit: 20, place_complete: 38 }),
    authored: true,
  },
  'C4': {
    modelKey: 'c4-optimized.glb',
    svgPath: '/ui_svgs/utility_c4.svg',
    audioUseKey: 'PLACEHOLDER_C4_USE',
    animationUseKey: 'PLACEHOLDER_C4_PLACE',
    animation: createUtilityAnimationContract('place', [7.163114, 10.813313, 3.523477], { equip_complete: 18, place_commit: 20, place_complete: 38 }),
    authored: true,
  },
};
