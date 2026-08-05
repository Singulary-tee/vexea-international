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
async function getCachedBlob(filename: string): Promise<Blob | null> {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(filename);

    request.onsuccess = () => {
      if (request.result) {
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
export async function hasCachedBlob(filename: string): Promise<boolean> {
  const db = await initDB();
  // Extract baseName for robust lookup
  const baseName = filename.substring(filename.lastIndexOf("/") + 1);
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(baseName);

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
 * Stores a blob directly in IndexedDB.
 */
async function setCachedBlob(filename: string, blob: Blob): Promise<void> {
  const db = await initDB();
  const baseName = filename.substring(filename.lastIndexOf("/") + 1);
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ filename: baseName, blob, timestamp: Date.now() });

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
 * Deletes a specific file from the IndexedDB cache.
 */
export async function deleteCachedFile(filename: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(filename);

    request.onsuccess = () => {
      // Also remove from blobUrlMap if present
      if (blobUrlMap.has(filename)) {
        URL.revokeObjectURL(blobUrlMap.get(filename)!);
        blobUrlMap.delete(filename);
      }
      resolve();
    };
    request.onerror = () => resolve();
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

let isPopulatingBlobUrlMap = false;

export async function populateBlobUrlMap(): Promise<void> {
  // Prevent concurrent repopulation from revoking URLs mid-load
  if (isPopulatingBlobUrlMap) return;
  isPopulatingBlobUrlMap = true;

  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    // Snapshot old URLs to revoke AFTER new ones are created
    const oldUrls = Array.from(blobUrlMap.values());
    blobUrlMap.clear();

    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const record = cursor.value;
        const blobUrl = URL.createObjectURL(record.blob);
        blobUrlMap.set(record.filename, blobUrl);
        cursor.continue();
      } else {
        // Revoke old URLs only after the new map is fully populated
        for (const url of oldUrls) {
          URL.revokeObjectURL(url);
        }
        isPopulatingBlobUrlMap = false;
        resolve();
      }
    };
    request.onerror = () => {
      isPopulatingBlobUrlMap = false;
      resolve();
    };
  });
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

export const REQUIRED_SOUNDS = [
  "vexea_theme.opus",
  "bass_scratch.mp3",
  "iron_march.opus",
  "click.opus",
  "error.mp3",
  "metal_ricochet.mp3",
  "wood_walk.mp3",
  "concrete_run.mp3",
  "concrete_walk.mp3",
  "rifle_reload.mp3",
  "pistol_reload.mp3",
  "pistol_fire.mp3",
  "rifle_fire.mp3"
];

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

  try {
    // 1. Clean filename from any subfolders for release pulling and map to real name
    const requestedName = filename.substring(filename.lastIndexOf("/") + 1);
    const baseName = mapRequestedFileToReal(requestedName);

    // 2. Check Local Cache first
    const cachedBlob = await getCachedBlob(baseName);
    if (cachedBlob) {
      if (onProgress) onProgress(100);
      return URL.createObjectURL(cachedBlob);
    }

    // 3. Download from appropriate GitHub Release CDN
    const r2Map: Record<string, string> = {
      ...Object.keys(ASSET_STRUCTURE).reduce((acc, key) => {
        acc[key] = `Models/Entities/${key}`;
        return acc;
      }, {} as Record<string, string>),
      "main_menu_1.webm": "Video/Backgrounds/main_menu_1.webm",
      "click.opus": "Audio/Sfx/click.opus",
      "vexea_theme.opus": "Audio/Music/vexea_theme.opus",
      "iron_march.opus": "Audio/Music/iron_march.opus",
      "armory_1.webp": "Images/Backgrounds/armory_1.webp",
      "faction_1.webp": "Images/Backgrounds/faction_1.webp",
      "stats_1.webp": "Images/Backgrounds/stats_1.webp",
      "store_1.webp": "Images/Backgrounds/store_1.webp",
      "splash_screen.webp": "Images/Backgrounds/splash_screen.webp",
      "file_00000000cdd071f48495d22753c89fa1.webp": "Images/Backgrounds/file_00000000cdd071f48495d22753c89fa1.webp",
      "infiltration_card_1.webp": "Images/Cards/infiltration_card_1.webp",
      "intel_card_1.webp": "Images/Cards/intel_card_1.webp",
      "leaderboard_card_1.webp": "Images/Cards/leaderboard_card_1.webp",
      "squad_card_1.webp": "Images/Cards/squad_card_1.webp",
      "update_card_1.webp": "Images/Cards/update_card_1.webp",
      "promo_rifle_1.webp": "Images/promotional/promo_rifle_1.webp",
      "promo_pistol_1.webp": "Images/promotional/promo_pistol_1.webp",
      "promo_shotgun_1.webp": "Images/promotional/promo_shotgun_1.webp",
      "attachments-optimized.glb": "Models/Weapons/attachments-optimized.glb",
      "brn_180-optimized.glb": "Models/Weapons/brn_180-optimized.glb",
      "f_90-optimized.glb": "Models/Weapons/f_90-optimized.glb",
      "hk_51-optimized.glb": "Models/Weapons/hk_51-optimized.glb",
      "scar_h_mk_17-optimized.glb": "Models/Weapons/scar_h_mk_17-optimized.glb",
      "scar_l-optimized.glb": "Models/Weapons/scar_l-optimized.glb"
    };

    let downloadUrl = "";
    if (r2Map[baseName]) {
      downloadUrl = `https://vexea-r2-asset-guard.alte.workers.dev/${r2Map[baseName]}`;
    } else {
      const baseUrl =
        category === "Asset"
          ? "https://github.com/Singulary-tee/vexea/releases/download/Asset"
          : category === "Video"
          ? "https://github.com/Singulary-tee/vexea/releases/download/Video"
          : category === "Image"
          ? "https://github.com/Singulary-tee/vexea/releases/download/Images"
          : "https://github.com/Singulary-tee/vexea/releases/download/Sound";
      downloadUrl = `${baseUrl}/${baseName}`;
    }
      
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
        throw new Error(`[Cache] CDN fetch failed for ${baseName}: status ${response.status} ${response.statusText}`);
      }
    } else {
      try {
        response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`Direct CDN fetch failed: status ${response.status}`);
        }
      } catch (directErr) {
        console.warn(`[Cache] Direct CDN fetch failed for ${baseName}, attempting proxy fallback:`, directErr);
        response = await fetch(proxyUrl);
        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(`[Cache] CDN fetch failed for ${baseName} via proxy fallback: ${response.status} ${response.statusText} - ${errorText}`);
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
        ? (baseName.toLowerCase().endsWith(".opus") ? "audio/ogg" : "audio/mp3")
        : category === "Video"
        ? (baseName.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4")
        : category === "Image"
        ? (baseName.toLowerCase().endsWith(".webp") ? "image/webp" : baseName.toLowerCase().endsWith(".jpg") || baseName.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png")
        : "application/octet-stream";
    const blob = new Blob([fullBuffer], { type: mime });

    // Cache it asynchronously
    await setCachedBlob(baseName, blob);

    if (onProgress) onProgress(100);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error(`[Cache] Fallback redirect activated for ${filename} due to:`, error);
    // Ultimate local backup fallback so development continues uninterrupted
    return localPath;
  }
}

/**
 * Returns the cached local blob URL if present in blobUrlMap, falling back to "/" paths.
 */
export function getAssetUrl(filename: string): string {
  const base = filename.substring(filename.lastIndexOf("/") + 1);
  if (blobUrlMap.has(base)) {
    return blobUrlMap.get(base)!;
  }
  return "/" + base;
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
    display: "flex", flexDirection: "column", gap: DS.spacing.xl, minWidth: "300px", maxWidth: "400px"
  });

  const title = document.createElement("div");
  title.textContent = "GAME ASSETS REQUIRED";
  Object.assign(title.style, {
    fontFamily: DS.typography.fontFamily, fontSize: "20px", color: DS.colors.accent,
    fontWeight: "bold", textTransform: "uppercase"
  });

  const desc = document.createElement("div");
  desc.textContent = `To enter the match, the engine needs to download missing combat assets. Proceed?`;
  Object.assign(desc.style, { fontFamily: DS.typography.fontFamily, fontSize: "14px", color: "#E8E8E8" });

  const progressWrap = document.createElement("div");
  Object.assign(progressWrap.style, { display: "none", flexDirection: "column", gap: "8px" });
  
  const barWrapper = document.createElement("div");
  Object.assign(barWrapper.style, { width: "100%", height: "4px", background: "#1A1A1A", borderRadius: "0px" });
  const barInner = document.createElement("div");
  Object.assign(barInner.style, { width: "0%", height: "100%", background: "#FFFFFF", transition: "width 0.1s", borderRadius: "0px" });
  barWrapper.appendChild(barInner);
  
  const progressText = document.createElement("div");
  Object.assign(progressText.style, { fontFamily: DS.typography.fontFamily, fontSize: "12px", color: "#888888" });
  
  progressWrap.appendChild(barWrapper);
  progressWrap.appendChild(progressText);

  const btnWrap = document.createElement("div");
  Object.assign(btnWrap.style, { display: "flex", gap: "12px", marginTop: "8px" });

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "CANCEL";
  Object.assign(cancelBtn.style, {
    flex: "1", padding: "8px", background: "transparent", border: "1px solid #555",
    color: "#888", fontFamily: DS.typography.fontFamily, cursor: "pointer"
  });
  cancelBtn.addEventListener("click", () => document.body.removeChild(modal));

  const acceptBtn = document.createElement("button");
  acceptBtn.textContent = "DOWNLOAD";
  Object.assign(acceptBtn.style, {
    flex: "1", padding: "8px", background: DS.colors.accent, border: "none",
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

    // Direct blob: object URLs (e.g. textures extracted from embedded GLB buffers) are passed directly only if known to be valid in blobUrlMap
    if (resolvedUrl.startsWith("blob:") && Array.from(blobUrlMap.values()).includes(resolvedUrl)) {
      return resolvedUrl;
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
