import { describe, expect, it, vi } from "vitest";

const {
  characterLoaderLoad,
  mapLoaderLoad,
  mapLoaderBuildScene,
  mapLoaderPlaceProps,
  mapLoaderDispose,
  loadingDestroy,
  missingFiles,
  downloadMapAssets,
  initPlayerWeapons,
  engineContext,
} = vi.hoisted(() => ({
  characterLoaderLoad: vi.fn(),
  mapLoaderLoad: vi.fn().mockResolvedValue(undefined),
  mapLoaderBuildScene: vi.fn().mockResolvedValue(undefined),
  mapLoaderPlaceProps: vi.fn(),
  mapLoaderDispose: vi.fn(),
  loadingDestroy: vi.fn(),
  missingFiles: vi.fn().mockResolvedValue([]),
  downloadMapAssets: vi.fn().mockResolvedValue(undefined),
  initPlayerWeapons: vi.fn().mockResolvedValue(undefined),
  engineContext: {
    renderer: null,
    camera: null,
    activeMatch: null as any,
    setPlayerModel: vi.fn(),
  },
}));

vi.mock("../client/src/ui/LoadingScreen", () => ({
  LoadingScreen: vi.fn().mockImplementation(function () {
    return {
    show: vi.fn(),
    setPhase: vi.fn(),
    setProgress: vi.fn(),
    destroy: loadingDestroy,
    };
  }),
}));
vi.mock("../client/src/map/MapLoader", () => ({
  MapLoader: vi.fn().mockImplementation(function () {
    return {
    load: mapLoaderLoad,
    buildScene: mapLoaderBuildScene,
    placeProps: mapLoaderPlaceProps,
    dispose: mapLoaderDispose,
    };
  }),
}));
vi.mock("../client/asset-cache", () => ({
  getMissingFilesForMap: missingFiles,
  downloadMapAssets,
  getCachedOrFetchUrl: vi.fn().mockResolvedValue("mock-vfx.png"),
  createConfiguredGLTFLoader: vi.fn(() => ({ load: characterLoaderLoad })),
  getAssetUrl: vi.fn((key: string) => key),
}));
vi.mock("../client/image-manifest", () => ({ IMAGE_MANIFEST: [] }));
vi.mock("../client/audio", () => ({
  audioManager: { loadGameplayAudio: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("../client/drone_models", () => ({ initDroneModels: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../client/weapons_model", () => ({ initPlayerWeapons }));
vi.mock("../client/context/ClientEngineContext", () => ({ engineContext }));
vi.mock("../client/src/systems/player-visual-calibration", () => ({
  normalizeGameplayPlayerModel: vi.fn(),
}));

import {
  orchestrateMatchLoad,
  shouldSignalMatchLoadComplete,
  waitForServerReady,
} from "../client/src/map/LoadingOrchestrator";
import * as THREE from "three/webgpu";

describe("match loading lifecycle", () => {
  it("only signals completion for the still-active match", () => {
    const current = { active: true } as any;
    const stale = { active: false } as any;

    expect(shouldSignalMatchLoadComplete(true, current, current)).toBe(true);
    expect(shouldSignalMatchLoadComplete(false, current, current)).toBe(false);
    expect(shouldSignalMatchLoadComplete(true, stale, stale)).toBe(false);
    expect(shouldSignalMatchLoadComplete(true, current, stale)).toBe(false);
    expect(shouldSignalMatchLoadComplete(true, current, null)).toBe(false);
  });

  it("fails closed when the server-ready confirmation times out", async () => {
    vi.useFakeTimers();
    try {
      (window as any)._serverMatchReady = false;
      const channel = {
        on: vi.fn(),
        off: vi.fn(),
      };
      const ready = waitForServerReady(channel, () => true, 1000);

      await vi.advanceTimersByTimeAsync(1000);

      await expect(ready).resolves.toBe(false);
      expect(channel.off).toHaveBeenCalledWith("match_ready", expect.any(Function));
    } finally {
      vi.useRealTimers();
    }
  });

  it("awaits the single weapon initialization path before signaling readiness", async () => {
    const order: string[] = [];
    const match = { active: true, visuals: { init: vi.fn() } } as any;
    engineContext.activeMatch = match;
    mapLoaderLoad.mockReset().mockResolvedValue(undefined);
    mapLoaderBuildScene.mockReset().mockResolvedValue(undefined);
    mapLoaderPlaceProps.mockReset();
    characterLoaderLoad.mockReset().mockImplementation((_url: string, onLoad: (gltf: unknown) => void) => {
      onLoad({ scene: new THREE.Group(), animations: [] });
    });
    initPlayerWeapons.mockReset().mockImplementation(async () => {
      order.push("weapons-ready");
    });
    const channel = {
      emit: vi.fn((event: string) => order.push(event)),
      on: vi.fn((event: string, listener: () => void) => {
        if (event === "match_ready") listener();
      }),
      off: vi.fn(),
    };

    await expect(orchestrateMatchLoad(
      {
        id: "map_1_facility",
        displayName: "Facility",
        specFile: "map.spec.json",
        assetDirectory: "assets/",
        version: "1",
        isDevMap: false,
      },
      channel,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      match,
    )).resolves.toBe(true);

    expect(initPlayerWeapons).toHaveBeenCalledOnce();
    expect(order.indexOf("weapons-ready")).toBeLessThan(order.indexOf("player_ready"));
    expect(match.visuals.init).toHaveBeenCalledOnce();
  });

  it("fails closed when map assets cannot load", async () => {
    mapLoaderLoad.mockReset().mockRejectedValueOnce(new Error("map unavailable"));
    characterLoaderLoad.mockImplementation((_url: string, onLoad: (gltf: unknown) => void) => {
      onLoad({ scene: new THREE.Group(), animations: [] });
    });
    const match = { active: true } as any;
    engineContext.activeMatch = match;
    const channel = {
      emit: vi.fn(),
      on: vi.fn((event: string, listener: () => void) => {
        if (event === "match_ready") listener();
      }),
      off: vi.fn(),
    };

    const loaded = await orchestrateMatchLoad(
      {
        id: "map_1_facility",
        displayName: "Facility",
        specFile: "map.spec.json",
        assetDirectory: "assets/",
        version: "1",
        isDevMap: false,
      },
      channel,
      new THREE.Scene(),
      undefined,
      match,
    );

    expect(loaded).toBe(false);
    expect(channel.emit).not.toHaveBeenCalledWith("player_ready", {});
    expect(loadingDestroy).toHaveBeenCalled();
    expect(mapLoaderDispose).toHaveBeenCalled();
    mapLoaderLoad.mockReset().mockResolvedValue(undefined);
  });

  it("fails closed when required map downloads fail", async () => {
    missingFiles.mockReset().mockResolvedValue(["wall.glb"]);
    downloadMapAssets.mockReset().mockRejectedValueOnce(new Error("download unavailable"));
    const match = { active: true } as any;
    engineContext.activeMatch = match;
    const channel = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };

    await expect(orchestrateMatchLoad(
      {
        id: "map_1_facility",
        displayName: "Facility",
        specFile: "map.spec.json",
        assetDirectory: "assets/",
        version: "1",
        isDevMap: false,
      },
      channel,
      new THREE.Scene(),
      undefined,
      match,
    )).resolves.toBe(false);

    expect(channel.emit).not.toHaveBeenCalledWith("player_ready", {});
    expect(loadingDestroy).toHaveBeenCalled();
    expect(mapLoaderDispose).toHaveBeenCalled();
    missingFiles.mockReset().mockResolvedValue([]);
    downloadMapAssets.mockReset().mockResolvedValue(undefined);
  });

  it("fails closed when the required character asset cannot load", async () => {
    characterLoaderLoad.mockImplementation((_url: string, _onLoad: unknown, _progress: unknown, onError: (error: Error) => void) => {
      onError(new Error("character unavailable"));
    });
    const match = { active: true } as any;
    engineContext.activeMatch = match;
    const channel = {
      emit: vi.fn(),
      on: vi.fn((event: string, listener: () => void) => {
        if (event === "match_ready") listener();
      }),
      off: vi.fn(),
    };

    const loaded = await orchestrateMatchLoad(
      {
        id: "map_1_facility",
        displayName: "Facility",
        specFile: "map.spec.json",
        assetDirectory: "assets/",
        version: "1",
        isDevMap: false,
      },
      channel,
      new THREE.Scene(),
      undefined,
      match,
    );

    expect(loaded).toBe(false);
    expect(channel.emit).not.toHaveBeenCalledWith("player_ready", {});
    expect(loadingDestroy).toHaveBeenCalled();
    expect(mapLoaderDispose).toHaveBeenCalled();
  });
});
