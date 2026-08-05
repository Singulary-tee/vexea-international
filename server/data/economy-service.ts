export interface StoreOffer {
  id: string;
  title: string;
  description: string;
  priceCredits: number;
  originalPriceCredits: number;
  discountPercentage: number;
  category: 'skins' | 'blueprints' | 'boosters' | 'bundles';
  icon: string;
  featured: boolean;
  itemType: string;
}

export interface FactionSector {
  id: string;
  name: string;
  controller: 'apex' | 'vanguard' | 'nexus' | 'contested';
  controlPercentage: number;
  activeBattles: number;
  resourceYield: number;
  defenseLevel: number;
}

export class ServerEconomyService {
  private static instance: ServerEconomyService;

  private constructor() {}

  public static getInstance(): ServerEconomyService {
    if (!ServerEconomyService.instance) {
      ServerEconomyService.instance = new ServerEconomyService();
    }
    return ServerEconomyService.instance;
  }

  public getOffers(discountActive: boolean, creditMultiplier: number): StoreOffer[] {
    const mult = creditMultiplier || 1.0;
    return [
      {
        id: 'offer_quantum_chassis',
        title: 'Quantum Drone Chassis',
        description: 'Elite titanium-alloy chassis skin with dynamic energy glowing trim.',
        priceCredits: Math.round(1200 * mult),
        originalPriceCredits: 1500,
        discountPercentage: discountActive ? 35 : 20,
        category: 'skins',
        icon: '🛡️',
        featured: true,
        itemType: 'chassis_skin_quantum',
      },
      {
        id: 'offer_neural_link_mk2',
        title: 'Neural Link Mk. II Blueprint',
        description: 'Advanced tactical telemetry interface reducing AI command latency by 15%.',
        priceCredits: Math.round(2400 * mult),
        originalPriceCredits: 3000,
        discountPercentage: discountActive ? 30 : 20,
        category: 'blueprints',
        icon: '🧠',
        featured: true,
        itemType: 'blueprint_neural_mk2',
      },
      {
        id: 'offer_credit_booster',
        title: '7-Day XP & Credit Booster',
        description: 'Double credit earnings and sector influence yield across all active matches.',
        priceCredits: Math.round(800 * mult),
        originalPriceCredits: 1000,
        discountPercentage: discountActive ? 40 : 20,
        category: 'boosters',
        icon: '⚡',
        featured: false,
        itemType: 'booster_7d',
      },
      {
        id: 'offer_tactical_pack',
        title: 'Apex Vanguard Operative Bundle',
        description: 'Includes 3 legendary skins, custom audio pack, and exclusive faction insignia.',
        priceCredits: Math.round(4500 * mult),
        originalPriceCredits: 6000,
        discountPercentage: discountActive ? 45 : 25,
        category: 'bundles',
        icon: '🎁',
        featured: true,
        itemType: 'bundle_apex_vanguard',
      },
    ];
  }

  public getFactionSectors(warMultiplier: number): FactionSector[] {
    const m = warMultiplier || 1.0;
    return [
      {
        id: 'sector_alpha',
        name: 'Sector Alpha - Orbital Spire',
        controller: 'apex',
        controlPercentage: Math.min(100, Math.round(62 * m)),
        activeBattles: 4,
        resourceYield: 1500,
        defenseLevel: 4,
      },
      {
        id: 'sector_beta',
        name: 'Sector Beta - Subterranean Foundry',
        controller: 'vanguard',
        controlPercentage: Math.min(100, Math.round(54 * m)),
        activeBattles: 7,
        resourceYield: 2200,
        defenseLevel: 5,
      },
      {
        id: 'sector_gamma',
        name: 'Sector Gamma - Neon Habitation Core',
        controller: 'nexus',
        controlPercentage: Math.min(100, Math.round(48 * m)),
        activeBattles: 2,
        resourceYield: 1100,
        defenseLevel: 3,
      },
      {
        id: 'sector_delta',
        name: 'Sector Delta - Wasteland Relay',
        controller: 'contested',
        controlPercentage: 50,
        activeBattles: 12,
        resourceYield: 3400,
        defenseLevel: 2,
      },
    ];
  }
}

export const serverEconomyService = ServerEconomyService.getInstance();
