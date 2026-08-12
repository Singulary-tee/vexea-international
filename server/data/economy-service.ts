import catalogData from "../../shared/catalog.json";
import { CatalogItem } from "../../shared/verification/types";

export interface StoreOffer {
  id: string;
  title: string;
  description: string;
  priceCredits: number;
  priceEnergy: number;
  currency: "credits" | "energy";
  originalPriceCredits: number;
  discountPercentage: number;
  category: "cosmetic" | "blueprint" | "booster" | "bundle";
  icon: string;
  featured: boolean;
  itemType: string;
  contains?: readonly string[];
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

export function getCatalogItems(): CatalogItem[] {
  return catalogData as CatalogItem[];
}

export function getFeaturedItems(): CatalogItem[] {
  return (catalogData as CatalogItem[]).filter((item) => item.featured === true);
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
    return getCatalogItems().map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      priceCredits: Math.round(item.priceCredits * mult),
      priceEnergy: item.priceEnergy,
      currency: item.currency,
      originalPriceCredits: item.priceCredits,
      discountPercentage: discountActive ? (item.discountPercentage || 20) : 0,
      category: item.category,
      icon: item.icon || "📦",
      featured: !!item.featured,
      itemType: item.id,
      contains: item.contains
    }));
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
        name: 'Sector Gamma - Central Habitation Core',
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

