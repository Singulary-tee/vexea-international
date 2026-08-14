/**
 * VEXEA Dynamic Asset Cache & Downloader
 * 
 * High-performance, zero-GC conscious IndexedDB local-storage manager.
 * Bypasses standard server disk storage, downloading resources on-demand or during
 * preloading, holding them as blobs to avoid cross-origin and memory leak overheads.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { getSettings } from "./settings";
import { DS } from "./design-system";
import { ASSET_STRUCTURE } from "../shared/asset-structure";
import { AUDIO_MANIFEST } from "./audio-manifest";
import { IMAGE_MANIFEST } from "./image-manifest";
import { VIDEO_MANIFEST } from "./video-manifest";
import { MODEL_MANIFEST } from "./model-manifest";

export const GLOBAL_ASSET_CACHE_VERSION = "1.0.0";

export function getAssetVersion(pathOrKey: string): string {
  const audio = AUDIO_MANIFEST.find(e => e.key === pathOrKey || e.path === pathOrKey);
  if (audio?.version) return audio.version;
  const img = IMAGE_MANIFEST.find(e => e.key === pathOrKey || e.path === pathOrKey);
  if (img?.version) return img.version;
  const vid = VIDEO_MANIFEST.find(e => e.key === pathOrKey || e.path === pathOrKey);
  if (vid?.version) return vid.version;
  const mdl = MODEL_MANIFEST.find(e => e.key === pathOrKey || e.path === pathOrKey);
  if (mdl?.version) return mdl.version;
  return GLOBAL_ASSET_CACHE_VERSION;
}

export function getCacheKey(filename: string, category?: string): string {
  if (!filename) return "";

  // 1. Check Audio manifest
  const audioEntry = AUDIO_MANIFEST.find(e => e.key === filename || e.path === filename || e.path.endsWith('/' + filename));
  if (audioEntry) return audioEntry.path;

  // 2. Check Image manifest
  const imageEntry = IMAGE_MANIFEST.find(e => e.key === filename || e.path === filename || e.path.endsWith('/' + filename));
  if (imageEntry) return imageEntry.path;

  // 3. Check Video manifest
  const videoEntry = VIDEO_MANIFEST.find(e => e.key === filename || e.path === filename || e.path.endsWith('/' + filename));
  if (videoEntry) return videoEntry.path;

  // 4. Check Model manifest
  const modelEntry = MODEL_MANIFEST.find(e => e.key === filename || e.path === filename || e.path.endsWith('/' + filename));
  if (modelEntry) return modelEntry.path;

  // Sound heuristic fallback
  if (category === "Sound" || filename.startsWith("Audio/") || filename.endsWith(".opus")) {
    const cleanName = filename.substring(filename.lastIndexOf("/") + 1).replace(/\.opus$/, '').replace(/\.mp3$/, '');
    const entry = AUDIO_MANIFEST.find(e => e.key === filename || e.key === cleanName || e.path.endsWith(filename));
    if (entry) return entry.path;
  }

  return filename.substring(filename.lastIndexOf("/") + 1);
}

const DB_NAME = "VexeaLocalCache";
const STORE_NAME = "files";
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

/**
 * Initializes the IndexedDB instance.
 */
function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "filename" });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = (err) => {
      console.error("[Cache] Failed to open IndexedDB", err);
      reject(err);
    };
  });
}

/**
 * Retrieves a cached block from IndexedDB.
 */
async function getCachedBlob(filename: string, category?: string): Promise<Blob | null> {
  const db = await initDB();
  const cacheKey = getCacheKey(filename, category);
  const expectedVersion = getAssetVersion(cacheKey);

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(cacheKey);

    request.onsuccess = () => {
      if (request.result) {
        if (request.result.version && request.result.version !== expectedVersion) {
          console.warn(`[CacheBuster] Stale cached asset detected for ${cacheKey} (cached: ${request.result.version}, required: ${expectedVersion}). Busting cache.`);
          deleteCachedFile(cacheKey);
          resolve(null);
          return;
        }
        resolve(request.result.blob);
      } else {
        resolve(null);
      }
    };

    request.onerror = () => {
      resolve(null);
    };
  });
}

/**
 * Checks if a file is already cached.
 */
export async function hasCachedBlob(filename: string, category?: string): Promise<boolean> {
  const db = await initDB();
  const cacheKey = getCacheKey(filename, category);
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(cacheKey);

    request.onsuccess = () => {
      if (request.result) {
        resolve(true);
      } else {
        resolve(false);
      }
    };

    request.onerror = () => resolve(false);
  });
}

/**
 * Stores a blob directly in IndexedDB with asset version metadata.
 */
async function setCachedBlob(filename: string, blob: Blob, category?: string): Promise<void> {
  const db = await initDB();
  const cacheKey = getCacheKey(filename, category);
  const version = getAssetVersion(cacheKey);

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ filename: cacheKey, blob, timestamp: Date.now(), version });

    request.onsuccess = () => resolve();
    request.onerror = () => resolve(); // fail silently, memory-only fallback is clean anyway
  });
}

/**
 * Lists all files currently in the IndexedDB cache.
 */
export async function listCachedFiles(): Promise<{ filename: string; timestamp: number; size: number }[]> {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result || [];
      resolve(results.map((r: any) => ({
        filename: r.filename,
        timestamp: r.timestamp,
        size: r.blob ? r.blob.size : 0
      })));
    };

    request.onerror = () => resolve([]);
  });
}

/**
 * Deletes a specific file from the IndexedDB cache using full path tracing.
 */
export async function deleteCachedFile(filename: string): Promise<void> {
  const db = await initDB();
  const cacheKey = getCacheKey(filename);
  const shortName = filename.substring(filename.lastIndexOf("/") + 1);

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.delete(cacheKey);
    if (cacheKey !== filename) {
      store.delete(filename);
    }
    if (shortName !== cacheKey && shortName !== filename) {
      store.delete(shortName);
    }

    transaction.oncomplete = () => {
      const keysToRemove = new Set([filename, cacheKey, shortName]);
      for (const k of keysToRemove) {
        if (blobUrlMap.has(k)) {
          const url = blobUrlMap.get(k)!;
          URL.revokeObjectURL(url);
          blobUrlMap.delete(k);
        }
      }
      resolve();
    };

    transaction.onerror = () => resolve();
  });
}

/**
 * Manually invalidates a cached asset, forcing a refetch on next access.
 */
export async function invalidateCachedAsset(filename: string): Promise<void> {
  return deleteCachedFile(filename);
}

/**
 * Scans the IndexedDB cache for any assets whose version does not match current manifest versions,
 * purging stale entries.
 */
export async function checkAndBustStaleCache(): Promise<number> {
  const db = await initDB();
  let bustedCount = 0;
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = async () => {
      const records = request.result || [];
      for (const rec of records) {
        const expectedVersion = getAssetVersion(rec.filename);
        if (rec.version && rec.version !== expectedVersion) {
          await deleteCachedFile(rec.filename);
          bustedCount++;
        }
      }
      resolve(bustedCount);
    };

    request.onerror = () => resolve(0);
  });
}

/**
 * Clears the entire IndexedDB cache.
 */
export async function clearCache(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      // Revoke all blob URLs
      for (const url of blobUrlMap.values()) {
        URL.revokeObjectURL(url);
      }
      blobUrlMap.clear();
      resolve();
    };
    request.onerror = () => resolve();
  });
}

/**
 * Maps a requested mock/virtual filename to the actual filename present in the release.
 */
export function mapRequestedFileToReal(filename: string): string {
  const base = filename.substring(filename.lastIndexOf("/") + 1);
  if (base === "defaultmaterial.glb" || base === "defaultmaterial_1.glb") return "concrete_block_low_poly.glb";
  if (base === "single_arm.glb" || base === "double_arm.glb") return "StreetLightPoles.glb";
  return base;
}

export const blobUrlMap = new Map<string, string>();

let activePopulatePromise: Promise<void> | null = null;

export const ALL_UI_SVGS: string[] = [
  "/ui_svgs/utility_grenade.svg",
  "/ui_svgs/utility_flashbang.svg",
  "/ui_svgs/utility_revive.svg",
  "/ui_svgs/utility_jammer.svg",
  "/ui_svgs/utility_c4.svg",
  "/ui_svgs/utility_mine.svg",
  "/ui_svgs/medkit.svg",
  "/ui_svgs/radio.svg",
  "/ui_svgs/class_assault.svg",
  "/ui_svgs/class_demolitions.svg",
  "/ui_svgs/class_medic.svg",
  "/ui_svgs/class_recon.svg",
  "/ui_svgs/faction_slopinc.svg",
  "/ui_svgs/faction_vibeco.svg",
  "/ui_svgs/gamemode_arena.svg",
  "/ui_svgs/gamemode_hardcore.svg",
  "/ui_svgs/gamemode_infiltration.svg",
  "/ui_svgs/fullscreen.svg",
  "/ui_svgs/fullscreen_exit.svg",
  "/ui_svgs/rifle.svg",
  "/ui_svgs/pistol.svg",
  "/ui_svgs/aim.svg",
  "/ui_svgs/reload.svg",
  "/ui_svgs/crouch.svg",
  "/ui_svgs/sprint.svg",
  "/ui_svgs/fire.svg",
  "/ui_svgs/helmet.svg",
  "/ui_svgs/up_arrow.svg",
  "/ui_svgs/player_arrow.svg",
  "/ui_svgs/right_arrow.svg",
  "/ui_svgs/add_friend.svg",
  "/ui_svgs/coin.svg",
  "/ui_svgs/energy.svg",
  "/ui_svgs/messages.svg",
  "/ui_svgs/microphone.svg",
  "/ui_svgs/profile.svg",
  "/ui_svgs/settings.svg",
  "/ui_svgs/status_signal.svg",
  "/ui_svgs/bandaid1.svg",
  "/ui_svgs/bandaid2.svg",
  "/ui_svgs/char1.svg",
  "/ui_svgs/char2.svg",
  "/ui_svgs/char3.svg",
  "/ui_svgs/char4.svg",
  "/ui_svgs/crosshair_circle.svg",
  "/ui_svgs/crosshair_cross.svg",
  "/ui_svgs/crosshair_dot.svg",
  "/ui_svgs/crosshair_t.svg",
  "/ui_svgs/damage_indicator.svg",
  "/ui_svgs/cursor.svg",
  "/ui_svgs/eye_full.svg",
  "/ui_svgs/eye_outer.svg",
  "/ui_svgs/eye_pupil.svg",
  "/ui_svgs/health_plus.svg",
  "/ui_svgs/health_status_critical.svg",
  "/ui_svgs/health_status_low.svg",
  "/ui_svgs/google.svg"
];

const svgDOMCache: HTMLImageElement[] = [];

export function preloadAllUISVGs(): void {
  if (typeof window === 'undefined' || typeof Image === 'undefined' || svgDOMCache.length > 0) return;
  for (const svgPath of ALL_UI_SVGS) {
    const img = new Image();
    img.src = svgPath;
    svgDOMCache.push(img);
  }
}

// Auto-trigger SVG preload immediately
if (typeof window !== "undefined") {
  preloadAllUISVGs();
}

export async function populateBlobUrlMap(): Promise<void> {
  // Deduplicate concurrent calls to prevent clearing or revoking blob URLs mid-load
  if (activePopulatePromise) return activePopulatePromise;

  activePopulatePromise = (async () => {
    try {
      preloadAllUISVGs();
      const db = await initDB();
      await new Promise<void>((resolve) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();

        request.onsuccess = (event: any) => {
          const cursor = event.target.result;
          if (cursor) {
            const record = cursor.value;
            // Only create new object URL if not already present in map to preserve active texture bindings
            if (!blobUrlMap.has(record.filename)) {
              const blobUrl = URL.createObjectURL(record.blob);
              blobUrlMap.set(record.filename, blobUrl);
            }
            cursor.continue();
          } else {
            // Pre-decode all cached images into DOM Image elements to prevent pop-in during screen transitions
            for (const [filename, url] of blobUrlMap.entries()) {
              const lower = filename.toLowerCase();
              if (lower.endsWith('.webp') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg')) {
                const img = new Image();
                img.src = url;
              }
            }
            resolve();
          }
        };
        request.onerror = () => {
          resolve();
        };
      });
    } finally {
      activePopulatePromise = null;
    }
  })();

  return activePopulatePromise;
}

/**
 * Static lists of required files for maps
 */
export const MAP_1_ASSETS = [
  "grenade.glb",
  "attachments-optimized.glb",
  "brn_180-optimized.glb",
  "f_90-optimized.glb",
  "hk_51-optimized.glb",
  "scar_h_mk_17-optimized.glb",
  "scar_l-optimized.glb",
  ...Object.keys(ASSET_STRUCTURE),
  "concrete_fence_low-poly.glb",
  "concrete_block_low_poly.glb",
  "StreetLightPoles.glb"
];

export const REQUIRED_SOUNDS = AUDIO_MANIFEST.map(e => e.path);

export function getRequiredFilesForMap(mapId: string): { name: string; cat: "Asset" | "Sound" | "Image" }[] {
  if (mapId === 'map_1_facility') {
    return [
      ...MAP_1_ASSETS.map(name => ({ name, cat: "Asset" as const })),
      ...REQUIRED_SOUNDS.map(name => ({ name, cat: "Sound" as const })),
      { name: "Surface_Impact.png", cat: "Image" as const }
    ];
  }
  return []; // Dev maps do not require external downloads
}

export async function getMissingFilesForMap(mapId: string): Promise<{ name: string; cat: "Asset" | "Sound" | "Image" }[]> {
  const reqs = getRequiredFilesForMap(mapId);
  const missing: { name: string; cat: "Asset" | "Sound" | "Image" }[] = [];
  for (const item of reqs) {
    const hasCached = await hasCachedBlob(item.name);
    if (!hasCached) {
      missing.push(item);
    }
  }
  return missing;
}

export async function downloadMapAssets(
  mapId: string,
  onProgress: (progress: { loaded: number; total: number; currentFile: string; filePercent: number }) => void
): Promise<void> {
  const missing = await getMissingFilesForMap(mapId);
  if (missing.length === 0) return;

  const total = missing.length;
  let loaded = 0;

  const queue = [...missing];
  const workerCount = 4;

  const processQueue = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      onProgress({ loaded, total, currentFile: item.name, filePercent: 0 });
      try {
        await getCachedOrFetchUrl(item.name, item.cat, (percent) => {
          onProgress({ loaded, total, currentFile: item.name, filePercent: percent });
        });
      } catch (e) {
        console.error(`[Cache] Error preloading ${item.name}:`, e);
      }
      loaded++;
      onProgress({ loaded, total, currentFile: item.name, filePercent: 100 });
    }
  };

  await Promise.all(Array(workerCount).fill(0).map(() => processQueue()));
}

/**
 * Normalizes filenames and fetches them from high-performance releases.
 */
export async function getCachedOrFetchUrl(
  filename: string,
  category: "Asset" | "Sound" | "Video" | "Image",
  onProgress?: (progress: number) => void
): Promise<string> {
  let localPath = filename;
  if (localPath.startsWith("client/public/")) {
    localPath = "/" + localPath.substring("client/public/".length);
  } else if (!localPath.startsWith("/") && !localPath.startsWith("http")) {
    // If it's a relative path name like 'defaultmaterial.glb', prepend the mapping prefix
    if (category === "Asset") {
      localPath = "/assets/maps/map_1/" + localPath;
    } else {
      localPath = "/" + localPath;
    }
  }

  const cacheKey = getCacheKey(filename, category);

  try {
    const existingBlobUrl = blobUrlMap.get(cacheKey);
    if (existingBlobUrl) {
      if (onProgress) onProgress(100);
      return existingBlobUrl;
    }

    // 2. Check Local Cache first
    const cachedBlob = await getCachedBlob(filename, category);
    if (cachedBlob) {
      if (onProgress) onProgress(100);
      if (blobUrlMap.has(cacheKey)) {
        return blobUrlMap.get(cacheKey)!;
      }
      const url = URL.createObjectURL(cachedBlob);
      blobUrlMap.set(cacheKey, url);
      return url;
    }

    // 3. Download from Cloudflare R2
    const downloadUrl = `https://vexea-r2-asset-guard.alte.workers.dev/${cacheKey}`;
      
    const s = getSettings();
    const serverPrefix = s.serverUrl ? s.serverUrl.replace(/\/$/, "") : "";
    const proxyUrl = `${serverPrefix}/api/proxy-asset?url=${encodeURIComponent(downloadUrl)}`;

    const isAiStudio = typeof window !== "undefined" && (
      window.location.hostname.endsWith(".run.app") ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );

    let response: Response;
    if (!isAiStudio) {
      // Production builds outside of AI Studio must fetch directly from CDN without server proxy
      response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`[Cache] CDN fetch failed for ${cacheKey}: status ${response.status} ${response.statusText}`);
      }
    } else {
      try {
        response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`Direct CDN fetch failed: status ${response.status}`);
        }
      } catch (directErr) {
        console.warn(`[Cache] Direct CDN fetch failed for ${cacheKey}, attempting proxy fallback:`, directErr);
        response = await fetch(proxyUrl);
        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(`[Cache] CDN fetch failed for ${cacheKey} via proxy fallback: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }
    }

    // Wrap reader to track progress
    const reader = response.body?.getReader();
    const contentLength = +(response.headers.get("Content-Length") || "0");

    let receivedLength = 0;
    const chunks: Uint8Array[] = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        if (contentLength && onProgress) {
          onProgress(Math.min(99, Math.floor((receivedLength / contentLength) * 100)));
        }
      }
    }

    // Assemble blob
    const fullBuffer = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, position);
      position += chunk.length;
    }

    const mime =
      category === "Sound"
        ? "audio/ogg"
        : category === "Video"
        ? (cacheKey.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4")
        : category === "Image"
        ? (cacheKey.toLowerCase().endsWith(".webp") ? "image/webp" : cacheKey.toLowerCase().endsWith(".jpg") || cacheKey.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png")
        : "application/octet-stream";
    const blob = new Blob([fullBuffer], { type: mime });

    // Cache it asynchronously
    await setCachedBlob(filename, blob, category);

    if (onProgress) onProgress(100);
    if (blobUrlMap.has(cacheKey)) {
      return blobUrlMap.get(cacheKey)!;
    }
    const url = URL.createObjectURL(blob);
    blobUrlMap.set(cacheKey, url);
    return url;
  } catch (error) {
    const isImage = category === "Image" || cacheKey.startsWith("Images/") || /\.(webp|png|jpg|jpeg|gif|svg)$/i.test(cacheKey);
    if (isImage) {
      console.warn(`[Cache] Image ${cacheKey} unavailable on R2. Creating clean placeholder blob.`);
      const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="100%" height="100%" fill="#111113"/><rect x="2" y="2" width="124" height="124" fill="none" stroke="#27272a" stroke-width="2"/><path d="M32 96 L64 48 L96 96 Z" fill="#27272a"/><circle cx="40" cy="40" r="8" fill="#3f3f46"/></svg>`;
      const blob = new Blob([placeholderSvg], { type: "image/svg+xml" });
      await setCachedBlob(filename, blob, category);
      const url = URL.createObjectURL(blob);
      blobUrlMap.set(cacheKey, url);
      blobUrlMap.set(filename, url);
      return url;
    }

    console.error(`[Cache] Fallback redirect activated for ${filename} due to:`, error);
    return localPath;
  }
}

/**
 * Returns the cached local blob URL if present in blobUrlMap, falling back to "/" paths.
 */
export function getAssetUrl(filename: string, category?: string): string {
  const cacheKey = getCacheKey(filename, category);
  if (blobUrlMap.has(cacheKey)) {
    return blobUrlMap.get(cacheKey)!;
  }
  return "/" + cacheKey;
}

export function warmImageDOMCache(filenames: string[]): void {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;
  filenames.forEach((filename) => {
    const url = getAssetUrl(filename);
    if (url) {
      const img = new Image();
      img.src = url;
    }
  });
}

export async function ensureAssetsDownloaded(onComplete: () => void, mapId: string) {
  const missingAssets = await getMissingFilesForMap(mapId);

  if (missingAssets.length === 0) {
    await populateBlobUrlMap();
    onComplete();
    return;
  }

  // Create Popup Modal
  const modal = document.createElement("div");
  Object.assign(modal.style, {
    position: "fixed", inset: "0", zIndex: "9999", display: "flex",
    alignItems: "center", justifyContent: "center", background: DS.utils.rgba('#000000', 0.85),
    backdropFilter: "blur(4px)"
  });

  const dialog = document.createElement("div");
  Object.assign(dialog.style, {
    background: DS.colors.background, border: `${DS.borders.thin} ${DS.colors.accent}`, padding: DS.spacing.xxl,
    display: "flex", flexDirection: "column", gap: DS.spacing.xl, minWidth: "18.75rem", maxWidth: "25.00rem"
  });

  const title = document.createElement("div");
  title.textContent = "GAME ASSETS REQUIRED";
  Object.assign(title.style, {
    fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.headingMd, color: DS.colors.accent,
    fontWeight: "bold", textTransform: "uppercase"
  });

  const desc = document.createElement("div");
  desc.textContent = `To enter the match, the engine needs to download missing combat assets. Proceed?`;
  Object.assign(desc.style, { fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.body, color: "#E8E8E8" });

  const progressWrap = document.createElement("div");
  Object.assign(progressWrap.style, { display: "none", flexDirection: "column", gap: "8px" });
  
  const barWrapper = document.createElement("div");
  Object.assign(barWrapper.style, { width: "100%", height: "4px", background: "#1A1A1A", borderRadius: "0px" });
  const barInner = document.createElement("div");
  Object.assign(barInner.style, { width: "0%", height: "100%", background: "#FFFFFF", transition: "width 0.1s", borderRadius: "0px" });
  barWrapper.appendChild(barInner);
  
  const progressText = document.createElement("div");
  Object.assign(progressText.style, { fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.small, color: "#888888" });
  
  progressWrap.appendChild(barWrapper);
  progressWrap.appendChild(progressText);

  const btnWrap = document.createElement("div");
  Object.assign(btnWrap.style, { display: "flex", gap: "0.75rem", marginTop: "0.50rem" });

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "CANCEL";
  Object.assign(cancelBtn.style, {
    flex: "1", padding: "0.50rem", background: "transparent", border: "1px solid #555",
    color: "#888", fontFamily: DS.typography.fontFamily, cursor: "pointer"
  });
  cancelBtn.addEventListener("click", () => document.body.removeChild(modal));

  const acceptBtn = document.createElement("button");
  acceptBtn.textContent = "DOWNLOAD";
  Object.assign(acceptBtn.style, {
    flex: "1", padding: "0.50rem", background: DS.colors.accent, border: "none",
    color: DS.colors.background, fontFamily: DS.typography.fontFamily, fontWeight: "bold", cursor: "pointer"
  });

  acceptBtn.addEventListener("click", async () => {
    btnWrap.style.display = "none";
    progressWrap.style.display = "flex";
    
    let completed = 0;
    const total = missingAssets.length;
    
    const workerCount = 4;
    const processQueue = async () => {
      while (missingAssets.length > 0) {
        const item = missingAssets.shift();
        if (item) {
          try { await getCachedOrFetchUrl(item.name, item.cat); } catch(e) {}
          completed++;
          const p = Math.floor((completed / total) * 100);
          barInner.style.width = p + "%";
          progressText.textContent = `Downloading... ${completed}/${total} (${p}%)`;
        }
      }
    };
    
    await Promise.all(Array(workerCount).fill(0).map(processQueue));
    await populateBlobUrlMap();
    
    progressText.textContent = "VEXEA SYSTEM READY";
    setTimeout(() => {
      document.body.removeChild(modal);
      onComplete();
    }, 500);
  });

  btnWrap.appendChild(cancelBtn);
  btnWrap.appendChild(acceptBtn);

  dialog.appendChild(title);
  dialog.appendChild(desc);
  dialog.appendChild(progressWrap);
  dialog.appendChild(btnWrap);
  modal.appendChild(dialog);
  document.body.appendChild(modal);
}

let sharedDracoLoader: DRACOLoader | null = null;
let sharedKtx2Loader: KTX2Loader | null = null;

function getSharedDracoLoader(): DRACOLoader {
  if (!sharedDracoLoader) {
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath('/draco/gltf/');
  }
  return sharedDracoLoader;
}

/**
 * Initializes KTX2 hardware support detection with the active Three.js WebGPU/WebGL renderer.
 * Must be called with a valid renderer before parsing KTX2/Basis compressed texture GLBs.
 */
export function initKTX2Support(rendererInstance: any): void {
  if (!sharedKtx2Loader) {
    sharedKtx2Loader = new KTX2Loader();
    sharedKtx2Loader.setTranscoderPath('/basis/');
  }
  if (rendererInstance && sharedKtx2Loader) {
    try {
      sharedKtx2Loader.detectSupport(rendererInstance);
      (sharedKtx2Loader as any)._supportDetected = true;
    } catch (e) {
      console.warn('[AssetCache] Error initializing KTX2Loader detectSupport:', e);
    }
  }
  if (sharedKtx2Loader && !(sharedKtx2Loader as any)._initStarted) {
    (sharedKtx2Loader as any)._initStarted = true;
    (sharedKtx2Loader as any).init().catch((err: any) => {
      console.error('[AssetCache] KTX2Loader basis transcoder init failed:', err);
    });
  }
}

function getSharedKtx2Loader(rendererInstance?: any): KTX2Loader {
  if (!sharedKtx2Loader) {
    sharedKtx2Loader = new KTX2Loader();
    sharedKtx2Loader.setTranscoderPath('/basis/');
  }
  const activeRenderer = rendererInstance || (typeof window !== 'undefined' ? (window as any).renderer || (window as any).W?.renderer : null);
  if (activeRenderer && !(sharedKtx2Loader as any)._supportDetected) {
    try {
      sharedKtx2Loader.detectSupport(activeRenderer);
      (sharedKtx2Loader as any)._supportDetected = true;
    } catch (e) {
      console.warn('[AssetCache] Error calling detectSupport in getSharedKtx2Loader:', e);
    }
  }
  return sharedKtx2Loader;
}

const fallback1x1Blob = new Blob([new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
])], { type: 'image/png' });
const fallback1x1Url = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(fallback1x1Blob) : '';

/**
 * Factory function to create a fully configured GLTFLoader instance with Draco
 * and KTX2 transcoder support attached.
 */
export function createConfiguredGLTFLoader(customManager?: THREE.LoadingManager, rendererInstance?: any): GLTFLoader {
  const manager = customManager || new THREE.LoadingManager();
  const existingModifier = (manager as any).urlModifier;

  manager.setURLModifier((url: string) => {
    let resolvedUrl = existingModifier ? existingModifier(url) : url;

    // Direct blob: object URLs (e.g. textures extracted from embedded GLB buffers) are passed directly
    if (resolvedUrl.startsWith("blob:")) {
      const lower = resolvedUrl.toLowerCase();
      const isRelativeLookup = lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".ktx2") || lower.endsWith(".dds") || lower.endsWith(".tga") || lower.endsWith(".bin");
      if (!isRelativeLookup) {
        return resolvedUrl;
      }
    }

    // Prevent GLTFLoader from failing on sub-resource texture/bin lookups relative to blob: or relative URLs
    const lower = resolvedUrl.toLowerCase();
    const isTexture = lower.includes(".jpg") || lower.includes(".jpeg") || lower.includes(".png") || lower.includes(".webp") || lower.includes(".ktx2") || lower.includes(".dds") || lower.includes(".tga");
    const isBin = lower.includes(".bin");

    if (isTexture || isBin) {
      const fileName = resolvedUrl.substring(resolvedUrl.lastIndexOf("/") + 1);
      if (blobUrlMap.has(fileName)) {
        return blobUrlMap.get(fileName)!;
      }
      if (isTexture) {
        return fallback1x1Url;
      }
    }

    return resolvedUrl;
  });

  const activeRenderer = rendererInstance || (typeof window !== 'undefined' ? ((window as any).renderer || (window as any).W?.renderer) : null);

  const loader = new GLTFLoader(manager);
  loader.setDRACOLoader(getSharedDracoLoader());
  loader.setKTX2Loader(getSharedKtx2Loader(activeRenderer));
  return loader;
}
