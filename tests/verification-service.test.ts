import { describe, it, expect } from 'vitest';
import { VerificationService } from '../server/verification/verification-service';

describe('VerificationService Tests', () => {
  it('should process match results correctly', () => {
    const input: any = {
      playerId: 'user-1',
      kills: 5,
      deaths: 2,
      isWin: true,
      matchDurationSec: 600,
      damageDealt: 1000
    };
    const result = VerificationService.processMatchResults(input);
    expect(result.isApproved).toBe(true);
    expect(result.xpEarned).toBeGreaterThan(0);
  });

  it('should process purchases', () => {
    const input: any = {
      playerId: 'user-1',
      currentCredits: 1000,
      currentLevel: 5,
      unlockedItems: []
    };
    const item: any = {
      id: 'test-item',
      priceCredits: 500,
      requiredLevel: 1
    };
    const result = VerificationService.processPurchase(input, item);
    expect(result.isApproved).toBe(true);
  });
});
