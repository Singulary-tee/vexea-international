export interface VideoManifestEntry {
  key: string;
  path: string;
  category: 'backgrounds' | 'cutscenes' | 'ui';
  loop?: boolean;
  version?: string;
}

export const VIDEO_MANIFEST: VideoManifestEntry[] = [
  { key: 'main_menu_1.webm', path: 'Video/Backgrounds/main_menu_1.webm', category: 'backgrounds', loop: true, version: '1.0.0' },
  { key: 'lobby_1.webm', path: 'Video/Backgrounds/lobby_1.webm', category: 'backgrounds', loop: true, version: '1.0.0' }
];

export type VideoKey = typeof VIDEO_MANIFEST[number]['key'];

export const VIDEO_PATHS: Record<string, string> = VIDEO_MANIFEST.reduce((acc, entry) => {
  acc[entry.key] = entry.path;
  return acc;
}, {} as Record<string, string>);

export function getVideoManifestEntry(key: string): VideoManifestEntry | undefined {
  return VIDEO_MANIFEST.find(e => e.key === key || e.path === key || e.path.endsWith('/' + key));
}
