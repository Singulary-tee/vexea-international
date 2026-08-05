/**
 * Server & Worker Verification Handler
 * Encapsulates post-match verification, purchasing, and claim checks for worker or API execution.
 */

import {
  VerifyPostMatchInput,
  VerifyPostMatchResult,
  VerifyPurchaseInput,
  VerifyPurchaseResult,
  VerifyClaimInput,
  VerifyClaimResult,
  VerifyBPClaimInput,
  VerifyBPClaimResult,
  CatalogItem
} from "../../shared/verification/types";

import {
  verifyPostMatchRewards,
  verifyPurchase,
  verifyClaim,
  verifyBPClaim,
  calculateLevelMetrics
} from "../../shared/verification/verifier";

export class VerificationService {
  public static processMatchResults(input: VerifyPostMatchInput): VerifyPostMatchResult {
    const result = verifyPostMatchRewards(input);
    if (result.isApproved) {
      const levelMetrics = calculateLevelMetrics(result.xpEarned);
      return {
        ...result,
        calculatedLevel: levelMetrics.level
      };
    }
    return result;
  }

  public static processPurchase(input: VerifyPurchaseInput, item: CatalogItem): VerifyPurchaseResult {
    return verifyPurchase(input, item);
  }

  public static processClaim(input: VerifyClaimInput): VerifyClaimResult {
    return verifyClaim(input);
  }

  public static processBPClaim(input: VerifyBPClaimInput): VerifyBPClaimResult {
    return verifyBPClaim(input);
  }
}

// Backwards compatibility alias
export const ValidationService = VerificationService;
