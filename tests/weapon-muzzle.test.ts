import { describe, expect, it, vi } from "vitest";
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
  getMuzzleWorldPosition,
  initPlayerWeapons,
  weaponsContainer,
} from "../client/weapons_model";

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
});
