import { describe, expect, it, vi } from "vitest";
import * as THREE from "three/webgpu";
import { engineContext } from "../client/context/ClientEngineContext";
import {
  createLocalPlayerRepresentation,
  LocalPlayerVisualSystem,
  syncLocalPlayerRepresentation,
  type LocalPlayerRepresentation,
} from "../client/src/systems/LocalPlayerVisualSystem";

function createPlayerFixture(): THREE.Group {
  const root = new THREE.Group();
  const hips = new THREE.Bone();
  hips.name = "mixamorig:Hips";
  const head = new THREE.Bone();
  head.name = "mixamorig:Head";
  head.position.y = 1.6;
  hips.add(head);
  root.add(hips);

  const body = new THREE.SkinnedMesh(
    new THREE.BoxGeometry(0.6, 1.8, 0.3),
    new THREE.MeshBasicMaterial(),
  );
  body.name = "PlayerBody";
  body.bind(new THREE.Skeleton([hips, head]));
  root.add(body);
  return root;
}

function getRepresentation(): LocalPlayerRepresentation {
  return createLocalPlayerRepresentation(createPlayerFixture());
}

function createHeadSkinnedFixture(): THREE.Group {
  const root = createPlayerFixture();
  const hips = root.getObjectByName("mixamorig:Hips") as THREE.Bone;
  const head = root.getObjectByName("mixamorig:Head") as THREE.Bone;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 1.4, 0, 0.2, 1.4, 0, 0, 1.8, 0], 3),
  );
  geometry.setIndex([0, 1, 2]);
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4),
  );
  const headMesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  headMesh.name = "HeadMesh";
  headMesh.bind(new THREE.Skeleton([hips, head]));
  root.add(headMesh);
  return root;
}

describe("local player representation", () => {
  it("clones the canonical character and keeps a dedicated eye anchor", () => {
    const canonical = createPlayerFixture();
    const representation = createLocalPlayerRepresentation(canonical);

    expect(representation.root.name).toBe("LocalPlayerRepresentation");
    expect(representation.model).not.toBe(canonical);
    expect(representation.root.getObjectByName("PlayerEyeAnchor")).toBe(representation.eyeAnchor);
    expect(representation.model.getObjectByName("PlayerBody")).toBeDefined();
    expect(representation.model.visible).toBe(true);
  });

  it("places the authored body from the calibrated feet origin and follows its head anchor", () => {
    const representation = getRepresentation();
    const playerPosition = new THREE.Vector3(4, 0.9, -2);

    syncLocalPlayerRepresentation(representation, playerPosition, Math.PI / 2);

    expect(representation.root.position).toEqual(new THREE.Vector3(4, 0, -2));
    const eyePosition = representation.eyeAnchor.getWorldPosition(new THREE.Vector3());
    expect(eyePosition.y).toBeCloseTo(1.6, 6);
    expect(eyePosition.x).toBeCloseTo(4.12, 6);
    expect(eyePosition.z).toBeCloseTo(-2, 6);
    expect(representation.root.rotation.y).toBeCloseTo(Math.PI / 2, 6);
  });

  it("drives camera position from the eye anchor while preserving view rotation", () => {
    const scene = new THREE.Scene();
    const visualSystem = new LocalPlayerVisualSystem(scene);
    const canonical = createPlayerFixture();
    const camera = new THREE.PerspectiveCamera();
    camera.quaternion.setFromEuler(new THREE.Euler(-0.25, 0.4, 0, "YXZ"));
    const viewRotation = camera.quaternion.clone();

    visualSystem.setCanonicalModel(canonical);
    visualSystem.update(0, new THREE.Vector3(4, 0.9, -2), Math.PI / 2, camera, 1.0);

    expect(camera.position.x).toBeCloseTo(4.12, 6);
    expect(camera.position.y).toBeCloseTo(1.0, 6);
    expect(camera.position.z).toBeCloseTo(-2, 6);
    expect(camera.quaternion.angleTo(viewRotation)).toBeCloseTo(0, 6);

    visualSystem.dispose();
  });

  it("only filters head-bound triangles when a head skin is present", () => {
    const representation = getRepresentation();
    const visibleMeshes: THREE.Object3D[] = [];
    representation.model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) visibleMeshes.push(child);
    });

    expect(visibleMeshes.length).toBe(1);
    expect(representation.headFilter.hiddenTriangles).toBe(0);
    expect(visibleMeshes[0].visible).toBe(true);
  });

  it("removes only fully head-weighted triangles from a skinned head mesh", () => {
    const canonical = createHeadSkinnedFixture();
    const sourceGeometry = (canonical.getObjectByName("HeadMesh") as THREE.SkinnedMesh).geometry;
    const representation = createLocalPlayerRepresentation(canonical);
    const headMesh = representation.model.getObjectByName("HeadMesh") as THREE.SkinnedMesh;

    expect(representation.headFilter.hiddenTriangles).toBe(1);
    expect(headMesh.geometry).not.toBe(sourceGeometry);
    expect(headMesh.userData.poseEditorOwnedGeometry).toBe(true);
    expect(headMesh.geometry.getIndex()?.count).toBe(0);
  });

  it("starts and transitions authored animation clips", () => {
    const canonical = createPlayerFixture();
    (canonical as any).animations = [
      new THREE.AnimationClip("rifle_idle", 1, [
        new THREE.NumberKeyframeTrack(".rotation[y]", [0, 1], [0, 0.5]),
      ]),
      new THREE.AnimationClip("rifle_aim_idle", 1, []),
    ];
    const scene = new THREE.Scene();
    const system = new LocalPlayerVisualSystem(scene);
    const camera = new THREE.PerspectiveCamera();

    system.setCanonicalModel(canonical);
    expect(system.representation?.currentClipName).toBe("rifle_idle");
    system.update(0.5, new THREE.Vector3(), 0, camera, 1.6, {
      isAlive: true,
      isAiming: true,
    });

    expect(system.representation?.currentClipName).toBe("rifle_aim_idle");
    system.dispose();
  });

  it("updates loop semantics when a shared clip changes state", () => {
    const canonical = createPlayerFixture();
    (canonical as any).animations = [
      new THREE.AnimationClip("rifle_idle", 1, []),
      new THREE.AnimationClip("pistol_kneeling_idle", 1, []),
    ];
    const system = new LocalPlayerVisualSystem(new THREE.Scene());
    const camera = new THREE.PerspectiveCamera();

    system.setCanonicalModel(canonical);
    system.update(0, new THREE.Vector3(), 0, camera, 1.6, { isAlive: false });
    expect(system.representation?.currentAction?.loop).toBe(THREE.LoopOnce);
    system.update(0, new THREE.Vector3(), 0, camera, 1.0, {
      isAlive: true,
      isCrouching: true,
    });

    expect(system.representation?.currentAction?.loop).toBe(THREE.LoopRepeat);
    expect(system.representation?.currentAction?.clampWhenFinished).toBe(false);

    system.dispose();
  });

  it("does not dispose shared canonical geometry with the local clone", () => {
    const canonical = createPlayerFixture();
    const geometry = (canonical.getObjectByName("PlayerBody") as THREE.SkinnedMesh).geometry;
    const dispose = vi.spyOn(geometry, "dispose");
    const system = new LocalPlayerVisualSystem(new THREE.Scene());

    system.setCanonicalModel(canonical);
    system.dispose();

    expect(dispose).not.toHaveBeenCalled();
  });

  it("owns the active weapon under the authored character instead of the camera", () => {
    const scene = new THREE.Scene();
    const system = new LocalPlayerVisualSystem(scene);
    const camera = new THREE.PerspectiveCamera();

    system.setCanonicalModel(createPlayerFixture());
    system.update(0, new THREE.Vector3(), 0, camera, 1.6, {
      isAlive: true,
      weapon: "rifle",
    });

    expect(system.ownsWeapon).toBe(true);
    expect(system.representation?.model.getObjectByName("LocalPlayerWeapon_rifle")).toBeDefined();

    system.dispose();
  });

  it("does not expose a muzzle from an unverified authored pose", () => {
    const system = new LocalPlayerVisualSystem(new THREE.Scene());
    const camera = new THREE.PerspectiveCamera();

    system.setCanonicalModel(createPlayerFixture());
    system.update(0, new THREE.Vector3(), 0, camera, 1.6, {
      isAlive: true,
      weapon: "rifle",
    });
    system.updateWeaponPose(camera);

    expect(system.weaponDiagnostics?.verified).toBe(false);
    expect(system.representation?.model.getObjectByName("LocalPlayerWeapon_rifle")?.visible).toBe(false);
    expect(system.getMuzzleWorldPosition(new THREE.Vector3())).toBe(false);

    system.dispose();
  });

  it("attaches a model published before or after the active match", () => {
    const previousMatch = engineContext.activeMatch;
    const previousModel = engineContext.playerModel;
    const scene = new THREE.Scene();
    const visualSystem = new LocalPlayerVisualSystem(scene);
    const activeMatch = { localPlayerVisual: visualSystem } as any;
    const canonical = createPlayerFixture();

    try {
      engineContext.setActiveMatch(null);
      engineContext.setPlayerModel(null);
      engineContext.setPlayerModel(canonical);
      engineContext.setActiveMatch(activeMatch);

      const firstRoot = visualSystem.representation?.root;
      expect(visualSystem.representation?.model).toBeDefined();
      expect(firstRoot?.parent).toBe(scene);

      const replacement = createPlayerFixture();
      engineContext.setPlayerModel(replacement);
      expect(visualSystem.representation?.root).not.toBe(firstRoot);
      expect(visualSystem.representation?.root.userData.sourceModel).toBe(replacement);
    } finally {
      visualSystem.dispose();
      engineContext.setActiveMatch(previousMatch);
      engineContext.setPlayerModel(previousModel);
    }
  });
});
