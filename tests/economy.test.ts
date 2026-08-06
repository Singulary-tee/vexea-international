import { describe, it, expect } from 'vitest';
import { serverEconomyService } from '../server/data/economy-service';

describe('Economy Service Tests', () => {
  it('should return store offers with correct multipliers', () => {
    const offers = serverEconomyService.getOffers(false, 1.0);
    expect(offers.length).toBeGreaterThan(0);
    expect(offers[0].priceCredits).toBe(1200);

    const discountedOffers = serverEconomyService.getOffers(true, 1.0);
    expect(discountedOffers[0].discountPercentage).toBe(35);

    const multipliedOffers = serverEconomyService.getOffers(false, 2.0);
    expect(multipliedOffers[0].priceCredits).toBe(2400);
  });

  it('should return faction sectors with correct multipliers', () => {
    const sectors = serverEconomyService.getFactionSectors(1.0);
    expect(sectors.length).toBeGreaterThan(0);
    expect(sectors[0].controlPercentage).toBe(62);

    const multipliedSectors = serverEconomyService.getFactionSectors(2.0);
    expect(multipliedSectors[0].controlPercentage).toBe(100); // capped at 100
  });
});
