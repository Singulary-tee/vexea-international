export interface ImageManifestEntry {
  key: string;
  path: string;
  category: 'backgrounds' | 'cards' | 'promotional' | 'decals' | 'ui';
  version?: string;
}

export const IMAGE_MANIFEST: ImageManifestEntry[] = [
  // Backgrounds
  { key: 'armory_1.webp', path: 'Images/Backgrounds/armory_1.webp', category: 'backgrounds', version: '1.0.0' },
  { key: 'faction_1.webp', path: 'Images/Backgrounds/faction_1.webp', category: 'backgrounds', version: '1.0.0' },
  { key: 'stats_1.webp', path: 'Images/Backgrounds/stats_1.webp', category: 'backgrounds', version: '1.0.0' },
  { key: 'store_1.webp', path: 'Images/Backgrounds/store_1.webp', category: 'backgrounds', version: '1.0.0' },
  { key: 'splash_screen.webp', path: 'Images/Backgrounds/splash_screen.webp', category: 'backgrounds', version: '1.0.0' },
  { key: 'file_00000000cdd071f48495d22753c89fa1.webp', path: 'Images/Backgrounds/file_00000000cdd071f48495d22753c89fa1.webp', category: 'backgrounds', version: '1.0.0' },

  // Cards
  { key: 'infiltration_card_1.webp', path: 'Images/Cards/infiltration_card_1.webp', category: 'cards', version: '1.0.0' },
  { key: 'intel_card_1.webp', path: 'Images/Cards/intel_card_1.webp', category: 'cards', version: '1.0.0' },
  { key: 'leaderboard_card_1.webp', path: 'Images/Cards/leaderboard_card_1.webp', category: 'cards', version: '1.0.0' },
  { key: 'squad_card_1.webp', path: 'Images/Cards/squad_card_1.webp', category: 'cards', version: '1.0.0' },
  { key: 'update_card_1.webp', path: 'Images/Cards/update_card_1.webp', category: 'cards', version: '1.0.0' },
  { key: 'assault_card_1.webp', path: 'Images/Cards/assault_card_1.webp', category: 'cards', version: '1.0.0' },
  { key: 'demolition_card_1.webp', path: 'Images/Cards/demolition_card_1.webp', category: 'cards', version: '1.0.0' },
  { key: 'medic_card_1.webp', path: 'Images/Cards/medic_card_1.webp', category: 'cards', version: '1.0.0' },
  { key: 'recon_card_1.webp', path: 'Images/Cards/recon_card_1.webp', category: 'cards', version: '1.0.0' },
  { key: 'feedback_card.png', path: 'Images/Cards/feedback_card.png', category: 'cards', version: '1.0.0' },
  { key: 'multiplayer_card.png', path: 'Images/Cards/multiplayer_card.png', category: 'cards', version: '1.0.0' },
  { key: 'slopInc_card.png', path: 'Images/Cards/slopInc_card.png', category: 'cards', version: '1.0.0' },
  { key: 'statistics_card.png', path: 'Images/Cards/statistics_card.png', category: 'cards', version: '1.0.0' },
  { key: 'store_card.png', path: 'Images/Cards/store_card.png', category: 'cards', version: '1.0.0' },
  { key: 'vibeCo_card.png', path: 'Images/Cards/vibeCo_card.png', category: 'cards', version: '1.0.0' },

  // Promotional
  { key: 'promo_rifle_1.webp', path: 'Images/promotional/promo_rifle_1.webp', category: 'promotional', version: '1.0.0' },
  { key: 'promo_pistol_1.webp', path: 'Images/promotional/promo_pistol_1.webp', category: 'promotional', version: '1.0.0' },
  { key: 'promo_shotgun_1.webp', path: 'Images/promotional/promo_shotgun_1.webp', category: 'promotional', version: '1.0.0' },

  // Decals & UI
  { key: 'Surface_Impact.png', path: 'Images/Decals/Surface_Impact.png', category: 'decals', version: '1.0.0' },
  { key: 'Blueprint.png', path: 'Images/UI/Blueprint.png', category: 'ui', version: '1.0.0' }
];

export type ImageKey = typeof IMAGE_MANIFEST[number]['key'];

export const IMAGE_PATHS: Record<string, string> = IMAGE_MANIFEST.reduce((acc, entry) => {
  acc[entry.key] = entry.path;
  return acc;
}, {} as Record<string, string>);

export function getImageManifestEntry(key: string): ImageManifestEntry | undefined {
  return IMAGE_MANIFEST.find(e => e.key === key || e.path === key || e.path.endsWith('/' + key));
}
