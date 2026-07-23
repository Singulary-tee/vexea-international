import {
  ValidatePostMatchInput,
  ValidatePostMatchResult,
  ValidatePurchaseInput,
  ValidatePurchaseResult,
  ValidateClaimInput,
  ValidateClaimResult,
  LevelMetrics,
  CatalogItem
} from "./types";

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
 * Pure, worker-ready match reward validation.
 * Audits match parameters (duration, kill rate, score) to prevent client manipulation.
 */
export function validatePostMatchRewards(input: ValidatePostMatchInput): ValidatePostMatchResult {
  if (!input.playerId) {
    return {
      isApproved: false,
      xpEarned: 0,
      creditsEarned: 0,
      error: { code: 'INVALID_PLAYER_ID', message: 'Player ID is required for validation.' }
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

  // Server-computed rewards
  const killXp = input.kills * 25;
  const winXp = input.isWin ? 200 : 50;
  const damageXp = Math.floor(input.damageDealt * 0.05);
  const totalXpEarned = killXp + winXp + damageXp;

  const baseCredits = 10;
  const winCredits = input.isWin ? 50 : 0;
  const killCredits = input.kills * 5;
  const totalCreditsEarned = baseCredits + winCredits + killCredits;

  return {
    isApproved: true,
    xpEarned: totalXpEarned,
    creditsEarned: totalCreditsEarned
  };
}

/**
 * Validates store and cosmetic item purchases.
 */
export function validatePurchase(
  input: ValidatePurchaseInput,
  catalogItem: CatalogItem
): ValidatePurchaseResult {
  if (!input.playerId) {
    return {
      isApproved: false,
      itemCost: 0,
      remainingCredits: input.currentCredits,
      error: { code: 'INVALID_PLAYER_ID', message: 'Player ID is required for validation.' }
    };
  }

  if (!catalogItem) {
    return {
      isApproved: false,
      itemCost: 0,
      remainingCredits: input.currentCredits,
      error: { code: 'ITEM_NOT_FOUND', message: 'Requested item does not exist in catalog.' }
    };
  }

  if (input.unlockedItems && input.unlockedItems.includes(catalogItem.id)) {
    return {
      isApproved: false,
      itemCost: catalogItem.priceCredits,
      remainingCredits: input.currentCredits,
      error: { code: 'ITEM_ALREADY_UNLOCKED', message: 'Item is already present in player unlocked inventory.' }
    };
  }

  if (input.currentLevel < catalogItem.requiredLevel) {
    return {
      isApproved: false,
      itemCost: catalogItem.priceCredits,
      remainingCredits: input.currentCredits,
      error: {
        code: 'REQUIRED_LEVEL_NOT_MET',
        message: `Player level (${input.currentLevel}) is below required level (${catalogItem.requiredLevel}).`
      }
    };
  }

  if (input.currentCredits < catalogItem.priceCredits) {
    return {
      isApproved: false,
      itemCost: catalogItem.priceCredits,
      remainingCredits: input.currentCredits,
      error: {
        code: 'INSUFFICIENT_CREDITS',
        message: `Current credits (${input.currentCredits}) are insufficient for item price (${catalogItem.priceCredits}).`
      }
    };
  }

  const remainingCredits = input.currentCredits - catalogItem.priceCredits;

  return {
    isApproved: true,
    itemCost: catalogItem.priceCredits,
    remainingCredits,
    unlockedItemId: catalogItem.id
  };
}

/**
 * Validates claims (daily refreshes, challenge rewards, dev refills).
 */
export function validateClaim(input: ValidateClaimInput): ValidateClaimResult {
  if (!input.playerId) {
    return {
      isApproved: false,
      rewardCredits: 0,
      rewardXp: 0,
      rewardEnergy: 0,
      newCredits: input.currentCredits,
      newEnergy: input.currentEnergy,
      error: { code: 'INVALID_PLAYER_ID', message: 'Player ID is required for validation.' }
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
