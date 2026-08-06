import { describe, it, expect } from 'vitest';
import { calculateLevelMetrics, verifyPostMatchRewards, verifyPurchase, verifyClaim, verifyBPClaim } from '../shared/verification/verifier';
import { BP_SEASON_01 } from '../shared/battle-pass';

describe('Verification System Core Logic', () => {
  describe('Leveling Metrics', () => {
    it('should correctly calculate level from XP', () => {
      const metrics = calculateLevelMetrics(250);
      expect(metrics.level).toBe(3);
      expect(metrics.progressPercent).toBe(50);
    });

    it('should handle zero or negative XP', () => {
      expect(calculateLevelMetrics(0).level).toBe(1);
      expect(calculateLevelMetrics(-100).level).toBe(1);
    });
  });

  describe('Post-Match Rewards', () => {
    it('should approve valid match results', () => {
      const input = {
        playerId: 'p1',
        matchDurationSec: 300,
        kills: 10,
        deaths: 5,
        damageDealt: 1000,
        isWin: true
      };
      const result = verifyPostMatchRewards(input);
      expect(result.isApproved).toBe(true);
      expect(result.xpEarned).toBeGreaterThan(0);
    });

    it('should reject invalid player id', () => {
       const result = verifyPostMatchRewards({ playerId: '', matchDurationSec: 300, kills: 0, deaths: 0, damageDealt: 0, isWin: false });
       expect(result.isApproved).toBe(false);
       expect(result.error?.code).toBe('INVALID_PLAYER_ID');
    });

    it('should reject short matches', () => {
       const result = verifyPostMatchRewards({ playerId: 'p1', matchDurationSec: 2, kills: 0, deaths: 0, damageDealt: 0, isWin: false });
       expect(result.isApproved).toBe(false);
       expect(result.error?.code).toBe('MATCH_DURATION_TOO_SHORT');
    });

    it('should reject negative metrics', () => {
       const result = verifyPostMatchRewards({ playerId: 'p1', matchDurationSec: 300, kills: -1, deaths: 0, damageDealt: 0, isWin: false });
       expect(result.isApproved).toBe(false);
       expect(result.error?.code).toBe('NEGATIVE_METRICS_DETECTED');
    });

    it('should reject excessive kill rates', () => {
       const result = verifyPostMatchRewards({ playerId: 'p1', matchDurationSec: 10, kills: 100, deaths: 0, damageDealt: 0, isWin: false });
       expect(result.isApproved).toBe(false);
       expect(result.error?.code).toBe('EXCESSIVE_KILL_RATE');
    });
  });

  describe('Purchase Verification', () => {
    const mockItem = { id: 'skin_01', priceCredits: 500, requiredLevel: 5, category: 'SKIN' } as any;

    it('should approve purchase if funds and level are sufficient', () => {
      const result = verifyPurchase({ playerId: 'p1', currentCredits: 1000, currentLevel: 10 }, mockItem);
      expect(result.isApproved).toBe(true);
      expect(result.remainingCredits).toBe(500);
    });

    it('should reject if already owned', () => {
      const result = verifyPurchase({ playerId: 'p1', currentCredits: 1000, currentLevel: 10, unlockedItems: ['skin_01'] }, mockItem);
      expect(result.isApproved).toBe(false);
      expect(result.error?.code).toBe('ITEM_ALREADY_UNLOCKED');
    });

    it('should reject if level too low', () => {
      const result = verifyPurchase({ playerId: 'p1', currentCredits: 1000, currentLevel: 1 }, mockItem);
      expect(result.isApproved).toBe(false);
      expect(result.error?.code).toBe('REQUIRED_LEVEL_NOT_MET');
    });

    it('should reject if credits too low', () => {
      const result = verifyPurchase({ playerId: 'p1', currentCredits: 100, currentLevel: 10 }, mockItem);
      expect(result.isApproved).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_CREDITS');
    });
  });

  describe('Claim Verification', () => {
    it('should approve daily login claim after interval', () => {
      const yesterday = Date.now() - (25 * 60 * 60 * 1000);
      const result = verifyClaim({ playerId: 'p1', currentCredits: 0, currentEnergy: 0, claimType: 'DAILY_LOGIN', lastClaimTimestamp: yesterday });
      expect(result.isApproved).toBe(true);
      expect(result.rewardCredits).toBe(100);
    });

    it('should reject daily login claim if on cooldown', () => {
      const justNow = Date.now() - 1000;
      const result = verifyClaim({ playerId: 'p1', currentCredits: 0, currentEnergy: 0, claimType: 'DAILY_LOGIN', lastClaimTimestamp: justNow });
      expect(result.isApproved).toBe(false);
      expect(result.error?.code).toBe('DAILY_REWARD_ON_COOLDOWN');
    });

    it('should approve dev refill', () => {
      const result = verifyClaim({ playerId: 'p1', currentCredits: 0, currentEnergy: 0, claimType: 'DEV_REFILL' });
      expect(result.isApproved).toBe(true);
    });
  });

  describe('Battle Pass Claims', () => {
    it('should approve valid BP tier claim', () => {
      const TIER_WITH_REWARD = 5;
      const tier = BP_SEASON_01.tiers[TIER_WITH_REWARD];
      const result = verifyBPClaim({
        playerId: 'p1',
        seasonId: BP_SEASON_01.id,
        tierIndex: TIER_WITH_REWARD,
        currentBPXP: tier.xpRequired + 1,
        claimedTiers: []
      });
      expect(result.isApproved).toBe(true);
    });

    it('should reject invalid season', () => {
      const result = verifyBPClaim({ playerId: 'p1', seasonId: 'wrong', tierIndex: 0, currentBPXP: 1000 });
      expect(result.isApproved).toBe(false);
      expect(result.error?.code).toBe('INVALID_SEASON_ID');
    });

    it('should reject already claimed tier', () => {
      const result = verifyBPClaim({
        playerId: 'p1',
        seasonId: BP_SEASON_01.id,
        tierIndex: 0,
        currentBPXP: 1000,
        claimedTiers: [0]
      });
      expect(result.isApproved).toBe(false);
      expect(result.error?.code).toBe('TIER_ALREADY_CLAIMED');
    });

    it('should reject if XP insufficient', () => {
      const result = verifyBPClaim({
        playerId: 'p1',
        seasonId: BP_SEASON_01.id,
        tierIndex: 1, // Assume tier 1 requires more XP
        currentBPXP: 0
      });
      expect(result.isApproved).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_XP');
    });
  });
});
