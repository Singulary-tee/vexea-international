import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";

const { createConfiguredGLTFLoader, getCachedOrFetchUrl, getMatch } = vi.hoisted(() => ({
  createConfiguredGLTFLoader: vi.fn(),
  getCachedOrFetchUrl: vi.fn(),
  getMatch: vi.fn(() => null),
}));

vi.mock("../client/asset-cache", () => ({
  createConfiguredGLTFLoader,
  getCachedOrFetchUrl,
}));
vi.mock("../client/MatchController", () => ({ getMatch }));

import {
  disposePlayerWeapons,
  getMuzzleWorldPosition,
  initPlayerWeapons,
  weaponsContainer,
} from "../client/weapons_model";

afterEach(() => {
  disposePlayerWeapons();
  getMatch.mockReturnValue(null);
});

function configureAssetMocks(): void {
  getCachedOrFetchUrl.mockResolvedValue("mock-weapon.glb");
  createConfiguredGLTFLoader.mockReturnValue({
    loadAsync: vi.fn(async () => ({
      scene: new THREE.Group(),
      animations: [],
    })),
  });
}

describe("first-person weapon muzzle basis", () => {
  it("shares one in-flight initialization for the same scene and camera", async () => {
    configureAssetMocks();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    const first = initPlayerWeapons(scene, camera);
    const second = initPlayerWeapons(scene, camera);

    expect(second).toBe(first);
    await expect(first).resolves.toBeDefined();
  });

  it("uses a procedural muzzle socket position once", async () => {
    configureAssetMocks();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    await initPlayerWeapons(scene, camera);

    const primaryGroup = weaponsContainer?.children[0] as THREE.Group | undefined;
    const muzzleNode = (primaryGroup as any)?.muzzleNode as THREE.Object3D | undefined;
    expect(muzzleNode).toBeDefined();

    const socketPosition = new THREE.Vector3();
    muzzleNode!.getWorldPosition(socketPosition);
    const muzzlePosition = new THREE.Vector3();
    getMuzzleWorldPosition(muzzlePosition, camera);

    expect(muzzlePosition.distanceTo(socketPosition)).toBeLessThan(1e-8);
  });

  it("does not expose the legacy muzzle while the authored weapon owns presentation", async () => {
    configureAssetMocks();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    await initPlayerWeapons(scene, camera);
    getMatch.mockReturnValue({
      localPlayerVisual: {
        ownsWeapon: true,
        getMuzzleWorldPosition: vi.fn(() => false),
      },
    });

    const muzzlePosition = new THREE.Vector3(7, 8, 9);
    const result = getMuzzleWorldPosition(muzzlePosition, camera);

    expect(result).toBe(false);
    expect(muzzlePosition).toEqual(new THREE.Vector3(7, 8, 9));
  });

  it("detaches and disposes the match-owned legacy weapon container", async () => {
    const geometryDisposals: ReturnType<typeof vi.spyOn>[] = [];
    const materialDisposals: ReturnType<typeof vi.spyOn>[] = [];
    getCachedOrFetchUrl.mockResolvedValue("mock-weapon.glb");
    createConfiguredGLTFLoader.mockReturnValue({
      loadAsync: vi.fn(async () => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial();
        geometryDisposals.push(vi.spyOn(geometry, "dispose"));
        materialDisposals.push(vi.spyOn(material, "dispose"));
        return {
          scene: new THREE.Mesh(geometry, material),
          animations: [],
        };
      }),
    });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    await initPlayerWeapons(scene, camera);
    const container = weaponsContainer;
    expect(container?.parent).toBe(camera);

    disposePlayerWeapons();

    expect(container?.parent).toBeNull();
    expect(camera.children).toHaveLength(0);
    expect(weaponsContainer).toBeNull();
    expect(geometryDisposals).toHaveLength(2);
    expect(materialDisposals).toHaveLength(2);
    expect(geometryDisposals.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
    expect(materialDisposals.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
  });

  it("rejects when a required weapon slot fails to load", async () => {
    const loadAsync = vi
      .fn()
      .mockResolvedValueOnce({ scene: new THREE.Group(), animations: [] })
      .mockRejectedValueOnce(new Error("secondary weapon unavailable"));
    getCachedOrFetchUrl.mockResolvedValue("mock-weapon.glb");
    createConfiguredGLTFLoader.mockReturnValue({ loadAsync });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    await expect(initPlayerWeapons(scene, camera)).rejects.toThrow("secondary weapon unavailable");
    expect(camera.children).toHaveLength(0);
  });
});
