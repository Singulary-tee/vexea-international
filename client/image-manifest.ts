export interface ImageManifestEntry {
  key: string;
  path: string;
  category: 'backgrounds' | 'cards' | 'promotional' | 'decals' | 'ui' | 'vfx';
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
  { key: 'Blueprint.png', path: 'Images/UI/Blueprint.png', category: 'ui', version: '1.0.0' },

  // VFX flipbooks and static layers
  { key: 'cloud_01_8x8_q90.webp', path: 'Images/VFX/Flipbooks/cloud_01_8x8_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'cloud_02_8x8_q90.webp', path: 'Images/VFX/Flipbooks/cloud_02_8x8_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'explosion_01_8x8_q90.webp', path: 'Images/VFX/Flipbooks/explosion_01_8x8_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'explosion_02_8x8_q90.webp', path: 'Images/VFX/Flipbooks/explosion_02_8x8_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'explosion_smoke_01_8x8_q90.webp', path: 'Images/VFX/Flipbooks/explosion_smoke_01_8x8_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'fire_01_8x8_q90.webp', path: 'Images/VFX/Flipbooks/fire_01_8x8_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'fire_02_8x8_q90.webp', path: 'Images/VFX/Flipbooks/fire_02_8x8_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'fire_03_8x8_q90.webp', path: 'Images/VFX/Flipbooks/fire_03_8x8_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'fire_04_8x8_q90.webp', path: 'Images/VFX/Flipbooks/fire_04_8x8_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'flame_01_16x4_q90.webp', path: 'Images/VFX/Flipbooks/flame_01_16x4_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'flame_02_15x4_q90.webp', path: 'Images/VFX/Flipbooks/flame_02_15x4_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'muzzle_flash_01_5frame_q90.webp', path: 'Images/VFX/Flipbooks/muzzle_flash_01_5frame_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'wispy_smoke_01_8x8_q90.webp', path: 'Images/VFX/Flipbooks/wispy_smoke_01_8x8_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'wispy_smoke_02_8x8_q90.webp', path: 'Images/VFX/Flipbooks/wispy_smoke_02_8x8_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'wispy_smoke_03_8x8_q90.webp', path: 'Images/VFX/Flipbooks/wispy_smoke_03_8x8_q90.webp', category: 'vfx', version: '1.0.0' },
  { key: 'circle_01_a.webp', path: 'Images/VFX/Static/circle_01_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'circle_02_a.webp', path: 'Images/VFX/Static/circle_02_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'circle_03_a.webp', path: 'Images/VFX/Static/circle_03_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'circle_04_a.webp', path: 'Images/VFX/Static/circle_04_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'circle_05_a.webp', path: 'Images/VFX/Static/circle_05_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'flare_01_a.webp', path: 'Images/VFX/Static/flare_01_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'muzzle_01_a.webp', path: 'Images/VFX/Static/muzzle_01_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'muzzle_02_a.webp', path: 'Images/VFX/Static/muzzle_02_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'muzzle_03_a.webp', path: 'Images/VFX/Static/muzzle_03_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'muzzle_04_a.webp', path: 'Images/VFX/Static/muzzle_04_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'muzzle_05_a.webp', path: 'Images/VFX/Static/muzzle_05_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'spark_01_a.webp', path: 'Images/VFX/Static/spark_01_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'spark_02_a.webp', path: 'Images/VFX/Static/spark_02_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'spark_03_a.webp', path: 'Images/VFX/Static/spark_03_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'spark_04_a.webp', path: 'Images/VFX/Static/spark_04_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'spark_05_a.webp', path: 'Images/VFX/Static/spark_05_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'spark_06_a.webp', path: 'Images/VFX/Static/spark_06_a.webp', category: 'vfx', version: '1.0.0' },
  { key: 'spark_07_a.webp', path: 'Images/VFX/Static/spark_07_a.webp', category: 'vfx', version: '1.0.0' }
];

export type ImageKey = typeof IMAGE_MANIFEST[number]['key'];

export const IMAGE_PATHS: Record<string, string> = IMAGE_MANIFEST.reduce((acc, entry) => {
  acc[entry.key] = entry.path;
  return acc;
}, {} as Record<string, string>);

export function getImageManifestEntry(key: string): ImageManifestEntry | undefined {
  return IMAGE_MANIFEST.find(e => e.key === key || e.path === key || e.path.endsWith('/' + key));
}
