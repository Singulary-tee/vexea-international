/**
 * VEXEA Battle Pass System - Shared Contracts
 * Phase 1: Free-track progression and tier structure.
 * Architected to be premium-ready for Phase 2 additive changes.
 */

export type BPRewardType = 'CREDITS' | 'COSMETIC';

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

  // Real current season window: Aug 2026 - Nov 2026 (~90 days)
  const startDate = 1785984000000; // 2026-08-06
  const endDate = startDate + (90 * 24 * 60 * 60 * 1000); // 1793760000000 (~90 days later)

  for (let i = 0; i <= TIER_COUNT; i++) {
    let freeReward: BPReward | null = null;

    // Fixed Free-Track Rewards using real CREDITS system
    if (i === 5) freeReward = { type: 'CREDITS', value: 100, label: '100 CREDITS' };
    else if (i === 10) freeReward = { type: 'CREDITS', value: 100, label: '100 CREDITS' };
    else if (i === 15) freeReward = { type: 'CREDITS', value: 150, label: '150 CREDITS' };
    else if (i === 20) freeReward = { type: 'CREDITS', value: 200, label: '200 CREDITS' };
    else if (i === 25) freeReward = { type: 'CREDITS', value: 200, label: '200 CREDITS' };
    else if (i === 30) freeReward = { type: 'CREDITS', value: 250, label: '250 CREDITS' };
    else if (i === 35) freeReward = { type: 'CREDITS', value: 300, label: '300 CREDITS' };
    else if (i === 40) freeReward = { type: 'CREDITS', value: 350, label: '350 CREDITS' };
    else if (i === 45) freeReward = { type: 'CREDITS', value: 400, label: '400 CREDITS' };
    else if (i === 50) freeReward = { type: 'CREDITS', value: 500, label: '500 CREDITS' };

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
    startDate,
    endDate,
    tiers
  };
}

export const BP_SEASON_01 = generateSeasonOne();
