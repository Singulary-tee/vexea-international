import { MapRegistryEntry } from "../../../shared/maps/map-registry";
import { LoadingScreen } from "../ui/LoadingScreen";
import { getMissingFilesForMap, downloadMapAssets, getCachedOrFetchUrl, createConfiguredGLTFLoader, getAssetUrl } from "../../asset-cache";
import { IMAGE_MANIFEST } from "../../image-manifest";
import { MapLoader } from "./MapLoader";
import { audioManager } from "../../audio";
import { initDroneModels } from "../../drone_models";
import { initPlayerWeapons } from "../../weapons_model";
import * as THREE from "three/webgpu";
import { engineContext } from "../../context/ClientEngineContext";
import { normalizeGameplayPlayerModel } from "../systems/player-visual-calibration";
import type { MatchController } from "../../MatchController";

let latestLoadOperation = 0;

export function shouldSignalMatchLoadComplete(
  loadSucceeded: boolean,
  match: Pick<MatchController, "active"> | null | undefined,
  activeMatch: MatchController | null,
): boolean {
  return loadSucceeded && !!match && match.active && activeMatch === match;
}

export async function orchestrateMatchLoad(
  mapEntry: MapRegistryEntry,
  channel: any,
  targetScene: THREE.Scene,
  camera?: THREE.Camera,
  match?: MatchController,
): Promise<boolean> {
  const operation = ++latestLoadOperation;
  const belongsToActiveMatch = () =>
    operation === latestLoadOperation && (!match || (match.active && engineContext.activeMatch === match));
  if (!belongsToActiveMatch()) return false;

  (window as any)._serverMatchReady = false; // Reset the server ready flag for the new match load!
  const loadingScreen = new LoadingScreen();
  const mapLoader = new MapLoader(targetScene);
  const discardStaleLoad = (): boolean => {
    loadingScreen.destroy();
    mapLoader.dispose();
    return false;
  };

  loadingScreen.show();

  // Phase 1 — Check Cache and Download Required Assets
  loadingScreen.setPhase('CHECKING CACHE');
  try {
    const missing = await getMissingFilesForMap(mapEntry.id);
    if (!belongsToActiveMatch()) {
      return discardStaleLoad();
    }

    if (missing.length > 0) {
      loadingScreen.setPhase('DOWNLOADING ASSETS');
      await downloadMapAssets(mapEntry.id, (progress) => {
        if (!belongsToActiveMatch()) return;
        loadingScreen.setPhase(`DOWNLOADING ${progress.currentFile.toUpperCase()}`);
        loadingScreen.setProgress(progress.loaded, progress.total);
      });
      if (!belongsToActiveMatch()) {
        return discardStaleLoad();
      }
    }
  } catch (e) {
    console.error('[LoadingOrchestrator] Failed to prepare map assets:', e);
    return discardStaleLoad();
  }

  // Preload and prewarm gameplay audio buffers into Howler
  loadingScreen.setPhase('PRELOADING AUDIO');
  try {
    await audioManager.loadGameplayAudio();
  } catch (e) {
    console.warn('[LoadingOrchestrator] Failed to preload gameplay audio:', e);
  }
  if (!belongsToActiveMatch()) {
    return discardStaleLoad();
  }

  // Preload VFX textures
  loadingScreen.setPhase('PRELOADING VFX TEXTURES');
  try {
    const vfxEntries = IMAGE_MANIFEST.filter(entry => entry.category === 'vfx');
    const totalVfx = vfxEntries.length;
    let loadedVfx = 0;
    const queue = [...vfxEntries];
    const workerCount = 4;
    const processQueue = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        try {
          await getCachedOrFetchUrl(item.key, 'Image');
        } catch (err) {
          console.warn(`[LoadingOrchestrator] Failed to preload VFX texture ${item.key}:`, err);
        }
        loadedVfx++;
        if (belongsToActiveMatch()) loadingScreen.setProgress(loadedVfx, totalVfx);
      }
    };
    await Promise.all(Array(workerCount).fill(0).map(() => processQueue()));
  } catch (e) {
    console.warn('[LoadingOrchestrator] Failed to preload VFX textures:', e);
  }
  if (!belongsToActiveMatch()) {
    return discardStaleLoad();
  }

  // Phase 2 — Build Scene & Map Props
  loadingScreen.setPhase('BUILDING MAP');
  loadingScreen.setProgress(0, 1);
  try {
    await mapLoader.load(mapEntry, belongsToActiveMatch);
    await mapLoader.buildScene(belongsToActiveMatch);
    mapLoader.placeProps(belongsToActiveMatch);
  } catch (e) {
    console.error("Error building map scene:", e);
    return discardStaleLoad();
  }
  if (!belongsToActiveMatch()) {
    return discardStaleLoad();
  }
  (window as any).__vexMapLoader = mapLoader;

  // Phase 3 — Load Character, Drone, and Weapon Models
  loadingScreen.setPhase('LOADING COMBAT ASSETS');
  loadingScreen.setProgress(0, 3);
  try {
    const renderer = engineContext.renderer || (window as any).renderer;
    const gltfLoader = createConfiguredGLTFLoader(undefined, renderer);

    // 1. Character model
    await new Promise<void>((resolve, reject) => {
      gltfLoader.load(
        getAssetUrl("Player_one-optimized.glb"),
        (gltf) => {
          const playerModel = gltf.scene;
          normalizeGameplayPlayerModel(playerModel);
          (playerModel as any).animations = gltf.animations;
          if (!belongsToActiveMatch()) {
            resolve();
            return;
          }
          engineContext.setPlayerModel(playerModel);
          (window as any).playerModel = playerModel;
          playerModel.traverse((child) => {
            if ((child as any).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          resolve();
        },
        undefined,
        (err) => {
          console.warn("[LoadingOrchestrator] Failed to load Player_one-optimized.glb:", err);
          reject(err);
        }
      );
    });
    loadingScreen.setProgress(1, 3);

    // 2. Drone procedural/hierarchy models
    await initDroneModels(targetScene);
    loadingScreen.setProgress(2, 3);

    // 3. Player weapon models
    const activeCamera = camera || engineContext.camera || (window as any).camera;
    if (activeCamera) {
      await initPlayerWeapons(targetScene, activeCamera);
    }
    loadingScreen.setProgress(3, 3);
  } catch (e) {
    console.warn("[LoadingOrchestrator] Error loading combat assets:", e);
    return discardStaleLoad();
  }
  if (!belongsToActiveMatch()) {
    return discardStaleLoad();
  }

  // Phase 4 — Prewarm shaders and materials with a multi-directional panoramic view from the spawn point
  loadingScreen.setPhase('PREWARMING SHADERS');
  const prewarmCam = new THREE.PerspectiveCamera(90, 1, 0.1, 2000);
  
  // Position near player spawn coordinates (384, 5, 10)
  prewarmCam.position.set(384, 5, 10);

  const renderer = (window as any).renderer;
  if (renderer) {
    try {
      // 6-directional panoramic targets to compile all faces, materials, and LODs across the map
      const targets = [
        new THREE.Vector3(384, 5, 500),  // North (Look forward towards center of map)
        new THREE.Vector3(384, 5, -500), // South (Look backward)
        new THREE.Vector3(500, 5, 10),   // East (Look right)
        new THREE.Vector3(-500, 5, 10),  // West (Look left)
        new THREE.Vector3(384, 500, 10), // Up (Look skyward)
        new THREE.Vector3(384, -500, 10) // Down (Look groundward)
      ];

      // Only compile once looking forward, as compilation is camera-independent.
      // Avoid compileAsync on mobile due to infinite driver hangs in fullscreen.
      prewarmCam.lookAt(targets[0]);
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isMobileDevice && typeof renderer.compileAsync === 'function') {
        await renderer.compileAsync(targetScene, prewarmCam);
      } else if (typeof renderer.compile === 'function') {
        renderer.compile(targetScene, prewarmCam);
      }
      
      // Dry run render one frame to make sure all draw state is primed on GPU
      if (typeof renderer.render === 'function') {
        renderer.render(targetScene, prewarmCam);
      }
      console.log('[VFX:PREWARM] Prewarm compile and mock render completed successfully');
    } catch (err) {
      console.warn('[VFX:PREWARM] Prewarm compile failed, bypassing:', err);
    }
  }

  if (!belongsToActiveMatch()) {
    return discardStaleLoad();
  }

  loadingScreen.setProgress(1, 1);

  // Send player_ready signal to the server
  if (channel && typeof channel.emit === 'function') {
    channel.emit("player_ready", {});
  }

  // Phase 5 — Wait for server ready confirmation
  loadingScreen.setPhase('WAITING FOR SERVER');
  const serverReady = await waitForServerReady(channel, belongsToActiveMatch);

  if (!serverReady || !belongsToActiveMatch()) {
    return discardStaleLoad();
  }

  match?.visuals?.init();
  loadingScreen.destroy();
  return true;
}

export async function waitForServerReady(
  channel: any,
  isCurrent: () => boolean = () => true,
  timeoutMs = 15000,
): Promise<boolean> {
  if (!isCurrent()) return false;
  if ((window as any)._serverMatchReady) return true;
  if (!channel || typeof channel.on !== 'function') {
    console.warn('[LOADING] No valid channel provided — aborting load');
    return false;
  }
  return new Promise((resolve) => {
    let resolved = false;
    let staleCheck: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const finish = (ready: boolean) => {
      if (resolved) return;
      resolved = true;
      if (staleCheck) clearInterval(staleCheck);
      if (timeout) clearTimeout(timeout);
      if (typeof channel.off === 'function') {
        channel.off('match_ready', handleMatchReady);
      }
      resolve(ready);
    };
    const handleMatchReady = () => {
      finish(true);
    };
    channel.on('match_ready', handleMatchReady);

    staleCheck = setInterval(() => {
      if (!isCurrent()) finish(false);
    }, 250);
    timeout = setTimeout(() => {
      if (!resolved) {
        console.warn('[LOADING] Server ready timeout — aborting load');
        finish(false);
      }
    }, timeoutMs);
  });
}
