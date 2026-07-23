/**
 * API and Interface Design compliant types for Server & Worker Validation.
 * Follows contract-first design, input/output separation, predictable naming,
 * and structured error semantics.
 */

export type PlayerId = string;
export type ItemId = string;
export type ChallengeId = string;

export type ClaimType = 'DAILY_LOGIN' | 'CHALLENGE_REWARD' | 'DEV_REFILL';

export interface APIErrorDetails {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Catalog Item Schema representing purchaseable cosmetics and blueprints.
 */
export interface CatalogItem {
  readonly id: ItemId;
  readonly title: string;
  readonly category: 'cosmetic' | 'blueprint' | 'weapon_skin';
  readonly faction?: string;
  readonly priceCredits: number;
  readonly requiredLevel: number;
  readonly description: string;
}

/**
 * Input contract for validating post-match statistics.
 */
export interface ValidatePostMatchInput {
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
 * Output result contract for post-match validation.
 */
export interface ValidatePostMatchResult {
  readonly isApproved: boolean;
  readonly xpEarned: number;
  readonly creditsEarned: number;
  readonly calculatedLevel?: number;
  readonly error?: APIErrorDetails;
}

/**
 * Input contract for store/armory purchase requests.
 */
export interface ValidatePurchaseInput {
  readonly playerId: PlayerId;
  readonly itemId: ItemId;
  readonly currentCredits: number;
  readonly currentLevel: number;
  readonly unlockedItems?: readonly ItemId[];
}

/**
 * Output result contract for store/armory purchases.
 */
export interface ValidatePurchaseResult {
  readonly isApproved: boolean;
  readonly itemCost: number;
  readonly remainingCredits: number;
  readonly unlockedItemId?: ItemId;
  readonly error?: APIErrorDetails;
}

/**
 * Input contract for claiming daily/challenge/refill rewards.
 */
export interface ValidateClaimInput {
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
export interface ValidateClaimResult {
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
