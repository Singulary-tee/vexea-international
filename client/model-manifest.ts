export interface ModelManifestEntry {
  key: string;
  path: string;
  category: 'entities' | 'weapons' | 'props' | 'environment';
  version?: string;
}

export const MODEL_MANIFEST: ModelManifestEntry[] = [
  // Entities
  { key: 'Player_one-optimized.glb', path: 'Models/Entities/Player_one-optimized.glb', category: 'entities', version: '1.0.0' },
  { key: 'humanoid-optimized.glb', path: 'Models/Entities/humanoid-optimized.glb', category: 'entities', version: '1.0.0' },
  { key: 'quadcopter_bmb-optimized.glb', path: 'Models/Entities/quadcopter_bmb-optimized.glb', category: 'entities', version: '1.0.0' },
  { key: 'quadcopter_cam-optimized.glb', path: 'Models/Entities/quadcopter_cam-optimized.glb', category: 'entities', version: '1.0.0' },
  { key: 'quadcopter_rifle-optimized.glb', path: 'Models/Entities/quadcopter_rifle-optimized.glb', category: 'entities', version: '1.0.0' },
  { key: 'uav-optimized.glb', path: 'Models/Entities/uav-optimized.glb', category: 'entities', version: '1.0.0' },
  { key: 'ugv-optimized.glb', path: 'Models/Entities/ugv-optimized.glb', category: 'entities', version: '1.0.0' },
  { key: 'robodog-optimized.glb', path: 'Models/Entities/robodog-optimized.glb', category: 'entities', version: '1.0.0' },

  // Weapons
  { key: 'attachments-optimized.glb', path: 'Models/Weapons/attachments-optimized.glb', category: 'weapons', version: '1.0.0' },
  { key: 'brn_180-optimized.glb', path: 'Models/Weapons/brn_180-optimized.glb', category: 'weapons', version: '1.0.0' },
  { key: 'f_90-optimized.glb', path: 'Models/Weapons/f_90-optimized.glb', category: 'weapons', version: '1.0.0' },
  { key: 'hk_51-optimized.glb', path: 'Models/Weapons/hk_51-optimized.glb', category: 'weapons', version: '1.0.0' },
  { key: 'scar_h_mk_17-optimized.glb', path: 'Models/Weapons/scar_h_mk_17-optimized.glb', category: 'weapons', version: '1.0.0' },
  { key: 'scar_l-optimized.glb', path: 'Models/Weapons/scar_l-optimized.glb', category: 'weapons', version: '1.0.0' }
];

export type ModelKey = typeof MODEL_MANIFEST[number]['key'];

export const MODEL_PATHS: Record<string, string> = MODEL_MANIFEST.reduce((acc, entry) => {
  acc[entry.key] = entry.path;
  return acc;
}, {} as Record<string, string>);

export function getModelManifestEntry(key: string): ModelManifestEntry | undefined {
  return MODEL_MANIFEST.find(e => e.key === key || e.path === key || e.path.endsWith('/' + key));
}
