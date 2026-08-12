/**
 * API and Interface Design compliant types for Server & Worker Verification.
 * Follows contract-first design, input/output separation, predictable naming,
 * and structured error semantics.
 */

export type PlayerId = string;
export type ItemId = string;
export type ChallengeId = string;

export type ClaimType = 'DAILY_LOGIN' | 'CHALLENGE_REWARD' | 'DEV_REFILL' | 'BATTLE_PASS_TIER';

export interface APIErrorDetails {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Catalog Item Schema representing purchaseable cosmetics, blueprints, boosters, and bundles.
 */
export interface CatalogItem {
  readonly id: ItemId;
  readonly title: string;
  readonly category: 'cosmetic' | 'blueprint' | 'booster' | 'bundle';
  readonly faction?: 'ANY' | 'apex' | 'vanguard' | 'nexus' | string;
  readonly priceCredits: number;
  readonly priceEnergy: number;
  readonly currency: 'credits' | 'energy';
  readonly requiredLevel: number;
  readonly description: string;
  readonly featured?: boolean;
  readonly discountPercentage?: number;
  readonly icon?: string;
  readonly contains?: readonly string[];
}

/**
 * Input contract for verifying post-match statistics.
 */
export interface VerifyPostMatchInput {
  readonly playerId: PlayerId;
  readonly matchDurationSec: number;
  readonly kills: number;
  readonly deaths: number;
  readonly damageDealt: number;
  readonly objectiveTimeHeld: number;
  readonly isWin: boolean;
  readonly gameMode: string;
}

/**
 * Output result contract for post-match verification.
 */
export interface VerifyPostMatchResult {
  readonly isApproved: boolean;
  readonly xpEarned: number;
  readonly creditsEarned: number;
  readonly calculatedLevel?: number;
  readonly error?: APIErrorDetails;
}

/**
 * Input contract for store/armory purchase verification requests.
 */
export interface VerifyPurchaseInput {
  readonly playerId: PlayerId;
  readonly itemId: ItemId;
  readonly currentCredits: number;
  readonly currentEnergy?: number;
  readonly currentLevel: number;
  readonly unlockedItems?: readonly ItemId[];
}

/**
 * Output result contract for store/armory purchases verification.
 */
export interface VerifyPurchaseResult {
  readonly isApproved: boolean;
  readonly itemCost: number;
  readonly remainingCredits: number;
  readonly remainingEnergy: number;
  readonly unlockedItemId?: ItemId;
  readonly error?: APIErrorDetails;
}

/**
 * Input contract for verifying ad reward claims.
 */
export interface VerifyAdRewardInput {
  readonly playerId: PlayerId;
  readonly currentEnergy: number;
  readonly adClaimsToday: number;
  readonly lastAdClaimDate: number;
}

/**
 * Output result contract for ad reward claim requests.
 */
export interface VerifyAdRewardResult {
  readonly isApproved: boolean;
  readonly newEnergy: number;
  readonly adClaimsToday: number;
  readonly error?: APIErrorDetails;
}

/**
 * Input contract for claiming daily/challenge/refill rewards.
 */
export interface VerifyClaimInput {
  readonly playerId: PlayerId;
  readonly claimType: ClaimType;
  readonly challengeId?: ChallengeId;
  readonly currentCredits: number;
  readonly currentEnergy: number;
  readonly lastClaimTimestamp?: number;
}

/**
 * Output result contract for reward claim requests.
 */
export interface VerifyClaimResult {
  readonly isApproved: boolean;
  readonly rewardCredits: number;
  readonly rewardXp: number;
  readonly rewardEnergy: number;
  readonly newCredits: number;
  readonly newEnergy: number;
  readonly error?: APIErrorDetails;
}

/**
 * Output metric breakdown for player progression/level calculations.
 */
export interface LevelMetrics {
  readonly level: number;
  readonly totalXp: number;
  readonly xpForCurrentLevel: number;
  readonly xpForNextLevel: number;
  readonly progressPercent: number;
}

/**
 * Input contract for claiming Battle Pass tier rewards.
 */
export interface VerifyBPClaimInput {
  readonly playerId: PlayerId;
  readonly tierIndex: number;
  readonly currentBPXP: number;
  readonly claimedTiers?: readonly number[];
  readonly seasonId: string;
}

/**
 * Output result contract for BP tier reward claims.
 */
export interface VerifyBPClaimResult {
  readonly isApproved: boolean;
  readonly reward?: {
    readonly credits?: number;
    readonly itemId?: ItemId;
    readonly label: string;
  };
  readonly error?: APIErrorDetails;
}
