/**
 * Server & Worker Validation Handler
 * Encapsulates post-match validation, purchasing, and claim checks for worker or API execution.
 */

import {
  ValidatePostMatchInput,
  ValidatePostMatchResult,
  ValidatePurchaseInput,
  ValidatePurchaseResult,
  ValidateClaimInput,
  ValidateClaimResult,
  CatalogItem
} from "../../shared/validation/types";

import {
  validatePostMatchRewards,
  validatePurchase,
  validateClaim,
  calculateLevelMetrics
} from "../../shared/validation/validator";

export class ValidationService {
  public static processMatchResults(input: ValidatePostMatchInput): ValidatePostMatchResult {
    const result = validatePostMatchRewards(input);
    if (result.isApproved) {
      const levelMetrics = calculateLevelMetrics(result.xpEarned);
      return {
        ...result,
        calculatedLevel: levelMetrics.level
      };
    }
    return result;
  }

  public static processPurchase(input: ValidatePurchaseInput, item: CatalogItem): ValidatePurchaseResult {
    return validatePurchase(input, item);
  }

  public static processClaim(input: ValidateClaimInput): ValidateClaimResult {
    return validateClaim(input);
  }
}
