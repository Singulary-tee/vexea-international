import {
  VerifyPostMatchInput,
  VerifyPostMatchResult,
  VerifyPurchaseInput,
  VerifyPurchaseResult,
  VerifyClaimInput,
  VerifyClaimResult,
  VerifyAdRewardInput,
  VerifyAdRewardResult,
  LevelMetrics,
  CatalogItem,
  VerifyBPClaimInput,
  VerifyBPClaimResult
} from "./types";
import { BP_SEASON_01 } from "../battle-pass";

export const XP_PER_LEVEL = 100;
export const MAX_MATCH_KILL_RATE = 2.0; // Kills per second threshold sanity limit
export const DAILY_CLAIM_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Calculates level and progress metrics based on cumulative total XP.
 */
export function calculateLevelMetrics(totalXp: number): LevelMetrics {
  const safeXp = Math.max(0, Math.floor(totalXp));
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const xpForCurrentLevel = (level - 1) * XP_PER_LEVEL;
  const xpForNextLevel = level * XP_PER_LEVEL;
  const currentLevelProgress = safeXp - xpForCurrentLevel;
  const progressPercent = Math.min(100, Math.max(0, Math.floor((currentLevelProgress / XP_PER_LEVEL) * 100)));

  return {
    level,
    totalXp: safeXp,
    xpForCurrentLevel,
    xpForNextLevel,
    progressPercent
  };
}

/**
 * Pure, worker-ready match reward verification.
 * Audits match parameters (duration, kill rate, score) to prevent client manipulation.
 */
export function verifyPostMatchRewards(input: VerifyPostMatchInput): VerifyPostMatchResult {
  if (!input.playerId) {
    return {
      isApproved: false,
      xpEarned: 0,
      creditsEarned: 0,
      error: { code: 'INVALID_PLAYER_ID', message: 'Player ID is required for verification.' }
    };
  }

  // Reject impossible match durations or negative metrics
  if (input.matchDurationSec < 5) {
    return {
      isApproved: false,
      xpEarned: 0,
      creditsEarned: 0,
      error: { code: 'MATCH_DURATION_TOO_SHORT', message: 'Match duration was too short for reward qualification.' }
    };
  }

  if (input.kills < 0 || input.deaths < 0 || input.damageDealt < 0) {
    return {
      isApproved: false,
      xpEarned: 0,
      creditsEarned: 0,
      error: { code: 'NEGATIVE_METRICS_DETECTED', message: 'Invalid stats: negative values detected.' }
    };
  }

  // Sanity check kill rates
  const killRate = input.kills / Math.max(1, input.matchDurationSec);
  if (killRate > MAX_MATCH_KILL_RATE) {
    return {
      isApproved: false,
      xpEarned: 0,
      creditsEarned: 0,
      error: { code: 'EXCESSIVE_KILL_RATE', message: 'Kills per second exceeded maximum allowed threshold.' }
    };
  }

  // Server-computed rewards (New reduced rates)
  const killXp = input.kills * 10;
  const winXp = input.isWin ? 75 : 0;
  const damageXp = Math.floor(input.damageDealt * 0.02);
  const totalXpEarned = 25 + winXp + killXp + damageXp;

  const baseCredits = 5;
  const winCredits = input.isWin ? 15 : 0;
  const killCredits = input.kills * 2;
  const totalCreditsEarned = baseCredits + winCredits + killCredits;

  return {
    isApproved: true,
    xpEarned: totalXpEarned,
    creditsEarned: totalCreditsEarned
  };
}

/**
 * Verifies store and cosmetic item purchases.
 */
export function verifyPurchase(
  input: VerifyPurchaseInput,
  catalogItem: CatalogItem
): VerifyPurchaseResult {
  const currentEnergy = input.currentEnergy ?? 0;

  if (!input.playerId) {
    return {
      isApproved: false,
      itemCost: 0,
      remainingCredits: input.currentCredits,
      remainingEnergy: currentEnergy,
      error: { code: 'INVALID_PLAYER_ID', message: 'Player ID is required for verification.' }
    };
  }

  if (!catalogItem) {
    return {
      isApproved: false,
      itemCost: 0,
      remainingCredits: input.currentCredits,
      remainingEnergy: currentEnergy,
      error: { code: 'ITEM_NOT_FOUND', message: 'Requested item does not exist in catalog.' }
    };
  }

  const isEnergyPurchase = catalogItem.currency === 'energy';
  const itemCost = isEnergyPurchase ? catalogItem.priceEnergy : catalogItem.priceCredits;

  if (input.unlockedItems && input.unlockedItems.includes(catalogItem.id)) {
    return {
      isApproved: false,
      itemCost,
      remainingCredits: input.currentCredits,
      remainingEnergy: currentEnergy,
      error: { code: 'ITEM_ALREADY_UNLOCKED', message: 'Item is already present in player unlocked inventory.' }
    };
  }

  if (input.currentLevel < catalogItem.requiredLevel) {
    return {
      isApproved: false,
      itemCost,
      remainingCredits: input.currentCredits,
      remainingEnergy: currentEnergy,
      error: {
        code: 'REQUIRED_LEVEL_NOT_MET',
        message: `Player level (${input.currentLevel}) is below required level (${catalogItem.requiredLevel}).`
      }
    };
  }

  if (isEnergyPurchase) {
    if (currentEnergy < catalogItem.priceEnergy) {
      return {
        isApproved: false,
        itemCost: catalogItem.priceEnergy,
        remainingCredits: input.currentCredits,
        remainingEnergy: currentEnergy,
        error: {
          code: 'INSUFFICIENT_ENERGY',
          message: `Current energy (${currentEnergy}) is insufficient for item price (${catalogItem.priceEnergy}).`
        }
      };
    }
  } else {
    if (input.currentCredits < catalogItem.priceCredits) {
      return {
        isApproved: false,
        itemCost: catalogItem.priceCredits,
        remainingCredits: input.currentCredits,
        remainingEnergy: currentEnergy,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: `Current credits (${input.currentCredits}) are insufficient for item price (${catalogItem.priceCredits}).`
        }
      };
    }
  }

  const remainingCredits = isEnergyPurchase ? input.currentCredits : input.currentCredits - catalogItem.priceCredits;
  const remainingEnergy = isEnergyPurchase ? currentEnergy - catalogItem.priceEnergy : currentEnergy;

  return {
    isApproved: true,
    itemCost,
    remainingCredits,
    remainingEnergy,
    unlockedItemId: catalogItem.id
  };
}

/**
 * Verifies ad reward claims for premium energy.
 */
export function verifyAdReward(input: VerifyAdRewardInput): VerifyAdRewardResult {
  if (!input.playerId) {
    return {
      isApproved: false,
      newEnergy: input.currentEnergy ?? 0,
      adClaimsToday: input.adClaimsToday ?? 0,
      error: { code: 'INVALID_PLAYER_ID', message: 'Player ID is required for verification.' }
    };
  }

  const lastDate = new Date(input.lastAdClaimDate || 0);
  const nowDate = new Date();
  const isSameDay =
    lastDate.getUTCFullYear() === nowDate.getUTCFullYear() &&
    lastDate.getUTCMonth() === nowDate.getUTCMonth() &&
    lastDate.getUTCDate() === nowDate.getUTCDate();

  const effectiveAdClaimsToday = isSameDay ? (input.adClaimsToday ?? 0) : 0;

  if (effectiveAdClaimsToday >= 5) {
    return {
      isApproved: false,
      newEnergy: input.currentEnergy ?? 0,
      adClaimsToday: effectiveAdClaimsToday,
      error: { code: 'AD_DAILY_CAP_REACHED', message: 'Daily ad reward cap reached.' }
    };
  }

  const newEnergy = (input.currentEnergy ?? 0) + 3;
  const newAdClaimsToday = effectiveAdClaimsToday + 1;

  return {
    isApproved: true,
    newEnergy,
    adClaimsToday: newAdClaimsToday
  };
}

/**
 * Verifies claims (daily refreshes, challenge rewards, dev refills).
 */
export function verifyClaim(input: VerifyClaimInput): VerifyClaimResult {
  if (!input.playerId) {
    return {
      isApproved: false,
      rewardCredits: 0,
      rewardXp: 0,
      rewardEnergy: 0,
      newCredits: input.currentCredits,
      newEnergy: input.currentEnergy,
      error: { code: 'INVALID_PLAYER_ID', message: 'Player ID is required for verification.' }
    };
  }

  if (input.claimType === 'DAILY_LOGIN') {
    if (input.lastClaimTimestamp) {
      const elapsed = Date.now() - input.lastClaimTimestamp;
      if (elapsed < DAILY_CLAIM_INTERVAL_MS) {
        return {
          isApproved: false,
          rewardCredits: 0,
          rewardXp: 0,
          rewardEnergy: 0,
          newCredits: input.currentCredits,
          newEnergy: input.currentEnergy,
          error: { code: 'DAILY_REWARD_ON_COOLDOWN', message: 'Daily reward claim is still on cooldown.' }
        };
      }
    }

    const rewardCredits = 100;
    const rewardEnergy = 100;
    return {
      isApproved: true,
      rewardCredits,
      rewardXp: 0,
      rewardEnergy,
      newCredits: input.currentCredits + rewardCredits,
      newEnergy: input.currentEnergy + rewardEnergy
    };
  }

  if (input.claimType === 'DEV_REFILL') {
    return {
      isApproved: true,
      rewardCredits: 1000,
      rewardXp: 0,
      rewardEnergy: 1000,
      newCredits: 1000,
      newEnergy: 1000
    };
  }

  return {
    isApproved: false,
    rewardCredits: 0,
    rewardXp: 0,
    rewardEnergy: 0,
    newCredits: input.currentCredits,
    newEnergy: input.currentEnergy,
    error: { code: 'UNKNOWN_CLAIM_TYPE', message: `Claim type ${input.claimType} is unrecognized.` }
  };
}

/**
 * Verifies Battle Pass tier claims.
 */
export function verifyBPClaim(input: VerifyBPClaimInput): VerifyBPClaimResult {
  if (!input.playerId) {
    return {
      isApproved: false,
      error: { code: 'INVALID_PLAYER_ID', message: 'Player ID is required for verification.' }
    };
  }

  // Find the season
  if (input.seasonId !== BP_SEASON_01.id) {
    return {
      isApproved: false,
      error: { code: 'INVALID_SEASON_ID', message: `Season ${input.seasonId} not found.` }
    };
  }

  const tier = BP_SEASON_01.tiers[input.tierIndex];
  if (!tier) {
    return {
      isApproved: false,
      error: { code: 'INVALID_TIER_INDEX', message: `Tier ${input.tierIndex} does not exist.` }
    };
  }

  // Check if already claimed
  if (input.claimedTiers && input.claimedTiers.includes(input.tierIndex)) {
    return {
      isApproved: false,
      error: { code: 'TIER_ALREADY_CLAIMED', message: `Tier ${input.tierIndex} has already been claimed.` }
    };
  }

  // Check XP requirement
  if (input.currentBPXP < tier.xpRequired) {
    return {
      isApproved: false,
      error: {
        code: 'INSUFFICIENT_XP',
        message: `Insufficient BP XP (${input.currentBPXP}) for Tier ${input.tierIndex} (requires ${tier.xpRequired}).`
      }
    };
  }

  if (!tier.freeReward) {
    return {
      isApproved: false,
      error: { code: 'NO_REWARD_ON_TIER', message: `Tier ${input.tierIndex} does not have a free reward.` }
    };
  }

  // Approve claim
  const reward = tier.freeReward;
  return {
    isApproved: true,
    reward: {
      credits: reward.type === 'CREDITS' ? (reward.value as number) : undefined,
      itemId: (reward.type === 'COSMETIC') ? (reward.value as string) : undefined,
      label: reward.label
    }
  };
}

// Aliases for backwards compatibility during migration
export const validatePostMatchRewards = verifyPostMatchRewards;
export const validatePurchase = verifyPurchase;
export const validateClaim = verifyClaim;
