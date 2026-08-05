/**
 * VEXEA Battle Pass System - Shared Contracts
 * Phase 1: Free-track progression and tier structure.
 * Architected to be premium-ready for Phase 2 additive changes.
 */

export type BPRewardType = 'CREDITS' | 'COSMETIC' | 'BLUEPRINT';

export interface BPReward {
  type: BPRewardType;
  value: string | number; // Amount of credits, or item ID from catalog
  label: string;
}

export interface BattlePassTier {
  index: number;
  xpRequired: number; // Cumulative XP needed to REACH this tier
  freeReward: BPReward | null;
  premiumReward: BPReward | null; // Reserved for Phase 2 (Explicitly null in Phase 1)
}

export interface BattlePassSeason {
  id: string;
  name: string;
  startDate: number; // ms timestamp
  endDate: number;   // ms timestamp
  tiers: BattlePassTier[];
}

/**
 * Generates the default season data with a flat XP curve.
 * 50 Tiers, 10 XP per tier.
 */
export function generateSeasonOne(): BattlePassSeason {
  const tiers: BattlePassTier[] = [];
  const TIER_COUNT = 50;
  const XP_PER_TIER = 10;

  for (let i = 0; i <= TIER_COUNT; i++) {
    let freeReward: BPReward | null = null;

    // Fixed Free-Track Rewards based on real catalog data
    if (i === 5) freeReward = { type: 'CREDITS', value: 100, label: '100 CREDITS' };
    else if (i === 10) freeReward = { type: 'COSMETIC', value: 'skin_vibe_stealth', label: 'PHANTOM BLACK SKIN' };
    else if (i === 15) freeReward = { type: 'CREDITS', value: 150, label: '150 CREDITS' };
    else if (i === 20) freeReward = { type: 'BLUEPRINT', value: 'bp_vx88_digital', label: 'DIGITAL CAMO BLUEPRINT' };
    else if (i === 25) freeReward = { type: 'CREDITS', value: 200, label: '200 CREDITS' };
    else if (i === 30) freeReward = { type: 'CREDITS', value: 250, label: '250 CREDITS' };
    else if (i === 35) freeReward = { type: 'CREDITS', value: 300, label: '300 CREDITS' };
    else if (i === 40) freeReward = { type: 'COSMETIC', value: 'skin_slop_heavy', label: 'INDUSTRIAL TITAN SKIN' };
    else if (i === 45) freeReward = { type: 'CREDITS', value: 400, label: '400 CREDITS' };
    else if (i === 50) freeReward = { type: 'BLUEPRINT', value: 'bp_viper_gold', label: 'GILDED SPEC PISTOL' };

    tiers.push({
      index: i,
      xpRequired: i * XP_PER_TIER,
      freeReward,
      premiumReward: null // RESERVED FOR PHASE 2
    });
  }

  return {
    id: 'SEASON_01',
    name: 'OPERATION: ZERO RESET',
    startDate: 1722888000000, // 2024-08-05
    endDate: 1730836800000,   // ~90 days later
    tiers
  };
}

export const BP_SEASON_01 = generateSeasonOne();
