import { describe, expect, it } from "vitest";
import * as THREE from "three/webgpu";
import { POSE_EDITOR_ITEMS, getPoseEditorItem } from "../client/pose-editor-config";
import { WEAPON_ASSET_DETAILS } from "../shared/asset-details";
import {
  aimDirectionFromBodyForward,
  chooseBarrelDirection,
  directionAlignmentAngle,
  directionFromEndpoint,
  evaluateFirstPersonComposition,
  evaluatePoseEditorReadiness,
  FIRST_PERSON_BODY_FORWARD,
  hasRenderedPixelContent,
  opticalAxisCorrection,
  planFirstPersonContentScale,
  planFirstPersonDepth,
  planFirstPersonFit,
} from "../client/pose-editor-composition";
import {
  alignPoseFrame,
  alignPoseDirection,
  bakeSkinnedMeshesForSoftware,
  findPlacementAnchor,
  measureMeshLongitudinalAxis,
  measureProbedBarrelAxis,
  placementAnchorPoint,
  projectedBounds,
  visibleWorldBounds,
  worldSpan,
} from "../client/pose-editor-geometry";
import {
  PLAYER_BODY_FORWARD,
  PLAYER_EYE_FORWARD_OFFSET,
} from "../client/src/systems/player-visual-calibration";

const weaponIds = ["rifle", "pistol", "smg", "shotgun", "lmg", "sniper"] as const;
const utilityIds = ["Grenade", "Flashbang", "Med Kit", "Revive Tool", "Radio", "Signal Jammer", "Proximity Mine", "C4"] as const;

describe("pose editor catalog", () => {
  it("authored muzzle axes follow the real shotgun, LMG, and sniper source geometry", () => {
    expect(WEAPON_ASSET_DETAILS.shotgun.animation?.muzzleAxis).toEqual([0, 0, -1]);
    expect(WEAPON_ASSET_DETAILS.lmg.animation?.muzzleAxis).toEqual([0, 0, -1]);
    expect(WEAPON_ASSET_DETAILS.sniper.animation?.muzzleAxis).toEqual([-1, 0, 0]);
  });

  it("keeps first-person framing on the authored chest-facing side", () => {
    expect(FIRST_PERSON_BODY_FORWARD).toEqual({ x: 0, y: 0, z: 1 });
    expect(PLAYER_BODY_FORWARD).toEqual(FIRST_PERSON_BODY_FORWARD);
  });

  it("keeps the eye anchor offset on the authored chest-facing side", () => {
    expect(PLAYER_EYE_FORWARD_OFFSET).toBeGreaterThan(0);
  });

  it("derives editor aim from the authored body axis rather than a measured barrel", () => {
    expect(aimDirectionFromBodyForward({ x: 0, y: 0, z: 1 })).toEqual({ x: 0, y: 0, z: 1 });
    expect(aimDirectionFromBodyForward({ x: 0, y: 0, z: 1 }, 0.25).y).toBeCloseTo(0.2425356, 6);
    expect(aimDirectionFromBodyForward({ x: 0, y: 0, z: 0 })).toEqual(FIRST_PERSON_BODY_FORWARD);
  });

  it("exposes real weapon and utility assets as deterministic editor items", () => {
    expect(POSE_EDITOR_ITEMS.map((item) => item.id)).toEqual([...weaponIds, ...utilityIds]);
    expect(new Set(POSE_EDITOR_ITEMS.map((item) => item.modelKey)).size).toBe(POSE_EDITOR_ITEMS.length);
    for (const id of [...weaponIds, ...utilityIds]) {
      const item = getPoseEditorItem(id);
      expect(item.modelKey).toMatch(/-optimized\.glb$/);
      expect(item.category).toMatch(/^(weapon|utility)$/);
      if (item.category === "utility") {
        expect(item.placementFrame).toEqual({
          forward: expect.any(Array),
          up: expect.any(Array),
        });
      }
    }
  });

  it("rejects unknown query selections instead of silently choosing an asset", () => {
    expect(getPoseEditorItem("unknown")).toBeUndefined();
  });

  it("identifies the jammer's source-geometry anchor mode", () => {
    expect(getPoseEditorItem("Signal Jammer").placementAnchor).toBe("visible-bounds-center");
    expect(getPoseEditorItem("Radio").placementAnchor).toBeUndefined();
  });

  it("falls back to visible utility geometry when an asset has no authored anchor node", () => {
    const root = new THREE.Group();
    const hidden = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    hidden.visible = false;
    const visible = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    root.add(hidden, visible);

    expect(findPlacementAnchor(root, ["PlacementReference"])).toBe(visible);
  });

  it("can anchor an offset fallback mesh by its visible bounds center", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.geometry.translate(0, 1, 0);
    expect(placementAnchorPoint(mesh)).toEqual(new THREE.Vector3(0, 0, 0));
    expect(placementAnchorPoint(mesh, "visible-bounds-center")).toEqual(new THREE.Vector3(0, 1, 0));
  });

  it("bakes skinned meshes for the software renderer without discarding the pose", () => {
    const root = new THREE.Group();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ], 3));
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute([
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ], 4));
    geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute([
      1, 0, 0, 0,
      1, 0, 0, 0,
      1, 0, 0, 0,
    ], 4));
    geometry.setIndex([0, 1, 2]);
    const bone = new THREE.Bone();
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    mesh.bind(new THREE.Skeleton([bone]));
    root.add(mesh, bone);

    expect(bakeSkinnedMeshesForSoftware(root)).toBe(1);
    expect(root.getObjectByProperty("isSkinnedMesh", true)).toBeUndefined();
    expect(root.children.some((child) => child.userData.poseEditorBakedSkin)).toBe(true);
  });

  it("preserves an explicitly transformed skinned mesh when baking for software projection", () => {
    const root = new THREE.Group();
    const parent = new THREE.Group();
    parent.position.set(1.2, -0.4, 2.1);
    parent.rotation.set(0.2, -0.3, 0.1);
    parent.scale.set(1.4, 0.8, 1.1);
    root.add(parent);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ], 3));
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute([
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ], 4));
    geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute([
      1, 0, 0, 0,
      1, 0, 0, 0,
      1, 0, 0, 0,
    ], 4));
    geometry.setIndex([0, 1, 2]);

    const bone = new THREE.Bone();
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    parent.add(mesh, bone);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.set(
      1, 0.2, 0, 0.4,
      0, 1, 0.1, -0.3,
      0, 0, 1, 0.2,
      0, 0, 0, 1,
    );
    mesh.bind(new THREE.Skeleton([bone]));
    root.updateMatrixWorld(true);

    const before = new THREE.Vector3();
    const expected: THREE.Vector3[] = [];
    for (let index = 0; index < 3; index += 1) {
      mesh.getVertexPosition(index, before);
      expected.push(before.clone().applyMatrix4(mesh.matrixWorld));
    }

    expect(bakeSkinnedMeshesForSoftware(root)).toBe(1);
    let baked: THREE.Mesh | null = null;
    root.traverse((child: any) => {
      if (child.userData.poseEditorBakedSkin) baked = child;
    });
    expect(baked).not.toBeNull();
    root.updateMatrixWorld(true);
    const actual: THREE.Vector3[] = [];
    for (let index = 0; index < 3; index += 1) {
      actual.push(before.fromBufferAttribute(baked!.geometry.getAttribute("position"), index)
        .applyMatrix4(baked!.matrixWorld).clone());
    }

    actual.forEach((point, index) => expect(point.distanceTo(expected[index])).toBeLessThan(1e-5));
  });

  it("keeps catalog-authored utility frames usable when assets omit placement nodes", () => {
    for (const id of utilityIds) {
      const frame = getPoseEditorItem(id).placementFrame;
      expect(frame).toBeDefined();
      const rotation = alignPoseFrame(
        new THREE.Vector3(...frame!.forward),
        new THREE.Vector3(...frame!.up),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0, 1, 0),
      );
      expect(rotation).not.toBeNull();
    }
    expect(getPoseEditorItem("Revive Tool").placementFrame?.forward).toEqual([1, 0, 0]);
  });

  it("fits weapons to measured player width without enlarging utilities", () => {
    expect(planFirstPersonFit("weapon", 0.6, 1.45)).toMatchObject({
      targetWidth: 0.6,
      scale: expect.closeTo(0.6 / 1.45, 8),
    });
    expect(planFirstPersonFit("utility", 0.6, 0.2).scale).toBe(1);
    expect(planFirstPersonFit("utility", 0.6, 1).scale).toBeCloseTo(0.33);
  });

  it("scales complete first-person content to the stricter projected bound", () => {
    expect(planFirstPersonContentScale(1, 0.48, 1.7)).toBeCloseTo(0.4, 8);
    expect(planFirstPersonContentScale(0.6, 0.2, 0.2)).toBeCloseTo(0.6, 8);
    expect(planFirstPersonContentScale(0.5437, 0.198, 0.702)).toBeCloseTo(0.5267, 4);
    expect(planFirstPersonContentScale(1, 4.59, 12.25)).toBeCloseTo(0.05551, 4);
  });

  it("moves an oversized view model deeper instead of shrinking its solved scale", () => {
    expect(planFirstPersonDepth(0.2, 0.87, 0.4)).toEqual({
      shift: expect.closeTo(0.1, 8),
      targetDepth: expect.closeTo(0.3, 8),
    });
    expect(planFirstPersonDepth(0.04, 0.2, 0.2).targetDepth).toBe(0.08);
    expect(planFirstPersonDepth(0.2, 10, 10).shift).toBeCloseTo(1.2);
  });

  it("derives business-end direction from the endpoint toward the muzzle", () => {
    const direction = directionFromEndpoint(
      { x: 0, y: 0, z: 2 },
      { x: 0, y: 0, z: 1 },
    );
    expect(direction).toEqual({ direction: { x: 0, y: 0, z: 1 }, length: 1 });
    expect(directionAlignmentAngle(direction!.direction, { x: 0, y: 0, z: 1 })).toBeCloseTo(0);
    expect(directionFromEndpoint({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 })).toBeNull();
  });

  it("centers a measured grip laterally without changing depth or height", () => {
    expect(opticalAxisCorrection(
      { x: 0.4, y: 0.2, z: 1.5 },
      { x: 0, y: 0.2, z: 1.5 },
      { x: 1, y: 0, z: 0 },
    )).toEqual({ x: -0.4, y: -0, z: -0 });
    expect(opticalAxisCorrection(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 0 },
    )).toBeNull();
  });

  it("rejects first-person acceptance when anatomy, visibility, depth, or barrel proof is incomplete", () => {
    const valid = {
      bilateralArmChain: true,
      handSeparationFraction: 0.08,
      leftHandVisible: true,
      rightHandVisible: true,
      bodyVisible: true,
      bodyWidthFraction: 0.2,
      bodyHeightFraction: 0.2,
      contentVisible: true,
      contentWidthFraction: 0.3,
      contentHeightFraction: 0.4,
      itemVisible: true,
      itemWidthFraction: 0.15,
      itemHeightFraction: 0.15,
      minDepth: 0.3,
      depthShift: 0.6,
      requiresItemOrientation: true,
      itemOrientationAlignment: 0.1,
      requiresBarrelAlignment: true,
      barrelCameraAlignment: 0.02,
      barrelAxisAgreement: 0.02,
    };
    expect(evaluateFirstPersonComposition(valid).accepted).toBe(true);
    expect(evaluateFirstPersonComposition({ ...valid, bilateralArmChain: false }).reason).toBe("bilateral arm bone chain unavailable");
    expect(evaluateFirstPersonComposition({ ...valid, handSeparationFraction: 0.01 }).reason).toBe("bilateral hands are not screen-readable");
    expect(evaluateFirstPersonComposition({ ...valid, bodyVisible: false }).reason).toBe("complete player body not visible");
    expect(evaluateFirstPersonComposition({ ...valid, contentVisible: false }).reason).toBe("first-person content not visible");
    expect(evaluateFirstPersonComposition({ ...valid, itemVisible: false }).reason).toBe("held item not visible");
    expect(evaluateFirstPersonComposition({ ...valid, itemOrientationAlignment: null }).reason).toBe("held item orientation is not authored");
    expect(evaluateFirstPersonComposition({ ...valid, depthShift: 1.21 }).reason).toBe("first-person depth search exceeded bound");
    expect(evaluateFirstPersonComposition({ ...valid, barrelCameraAlignment: null }).reason).toBe("measured barrel is not camera-forward");
  });

  it("allows natural first-person cropping without weakening minimum visibility checks", () => {
    const oversized = {
      bilateralArmChain: true,
      handSeparationFraction: 0.08,
      leftHandVisible: true,
      rightHandVisible: true,
      bodyVisible: true,
      bodyWidthFraction: 4.59,
      bodyHeightFraction: 12.25,
      contentVisible: true,
      contentWidthFraction: 4.59,
      contentHeightFraction: 12.25,
      itemVisible: true,
      itemWidthFraction: 1.34,
      itemHeightFraction: 0.72,
      minDepth: 0.13,
      depthShift: 0,
      naturalFirstPersonCropping: true,
      requiresBarrelAlignment: false,
      barrelCameraAlignment: null,
      barrelAxisAgreement: 0,
    };
    expect(evaluateFirstPersonComposition(oversized).accepted).toBe(true);
    expect(evaluateFirstPersonComposition({ ...oversized, naturalFirstPersonCropping: false }).reason)
      .toBe("first-person content exceeds view bounds");
  });

  it("rejects a held rifle when an animated hand is outside the readable camera viewport", () => {
    const frame = {
      bilateralArmChain: true,
      handSeparationFraction: 1.858,
      leftHandVisible: false,
      rightHandVisible: true,
      bodyVisible: true,
      bodyWidthFraction: 4.476,
      bodyHeightFraction: 11.964,
      contentVisible: true,
      contentWidthFraction: 4.476,
      contentHeightFraction: 11.964,
      itemVisible: true,
      itemWidthFraction: 1.362,
      itemHeightFraction: 0.665,
      minDepth: 0.13,
      depthShift: 0,
      naturalFirstPersonCropping: true,
      requiresBarrelAlignment: false,
      barrelCameraAlignment: 0.02,
      barrelAxisAgreement: 0.0139,
    };

    expect(evaluateFirstPersonComposition(frame).reason).toBe("left hand is not screen-readable");
  });

  it("does not accept first-person readiness without a durable visible renderer frame", () => {
    const valid = {
      solverVerified: true,
      compositionAccepted: true,
      contextLost: false,
      durableFrame: true,
      canvasContent: true,
    };
    expect(evaluatePoseEditorReadiness(valid).accepted).toBe(true);
    expect(evaluatePoseEditorReadiness({ ...valid, contextLost: true }).reason)
      .toBe("renderer context lost");
    expect(evaluatePoseEditorReadiness({ ...valid, durableFrame: false }).reason)
      .toBe("durable rendered frame unavailable");
    expect(evaluatePoseEditorReadiness({ ...valid, canvasContent: false }).reason)
      .toBe("rendered canvas content unavailable");
  });

  it("rejects a uniform clear frame and accepts a measurable rendered subject", () => {
    const clear = new Uint8Array(8 * 8 * 4);
    for (let index = 0; index < clear.length; index += 4) {
      clear[index] = 8;
      clear[index + 1] = 13;
      clear[index + 2] = 20;
      clear[index + 3] = 255;
    }
    expect(hasRenderedPixelContent(clear, 8, 8)).toBe(false);

    const subject = clear.slice();
    for (let index = 3 * 4 * 8; index < 5 * 4 * 8; index += 4) {
      subject[index] = 220;
      subject[index + 1] = 160;
      subject[index + 2] = 80;
      subject[index + 3] = 255;
    }
    expect(hasRenderedPixelContent(subject, 8, 8)).toBe(true);
  });

  it("aligns the weapon frame without leaving roll underconstrained", () => {
    const rotation = alignPoseFrame(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 1, 0),
    );
    expect(rotation).not.toBeNull();
    expect(new THREE.Vector3(0, 0, 1).applyQuaternion(rotation!).dot(new THREE.Vector3(0, 0, 1))).toBeCloseTo(1);
    expect(new THREE.Vector3(0, -1, 0).applyQuaternion(rotation!).dot(new THREE.Vector3(0, 1, 0))).toBeCloseTo(1);
  });

  it("aligns a measured barrel direction to the body-forward axis", () => {
    const rotation = alignPoseDirection(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 1),
    );
    expect(rotation).not.toBeNull();
    expect(new THREE.Vector3(1, 0, 0).applyQuaternion(rotation!).dot(new THREE.Vector3(0, 0, 1))).toBeCloseTo(1);
    expect(alignPoseDirection(new THREE.Vector3(), new THREE.Vector3(0, 0, 1))).toBeNull();
  });

  it("rejects a conflicting measured barrel axis instead of overriding the authored contract", () => {
    expect(chooseBarrelDirection(
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 0 },
    )).toEqual({
      direction: { x: 0, y: 0, z: 1 },
      source: "authored",
      agreement: expect.closeTo(Math.PI / 2, 8),
    });
    expect(chooseBarrelDirection(
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 0 },
    )).toEqual({
      direction: { x: 0, y: 0, z: 1 },
      source: "authored",
      agreement: 0,
    });
  });

  it("accepts aligned measured axes, tolerates mild drift, and rejects invalid values", () => {
    expect(chooseBarrelDirection(
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 4 },
    ).source).toBe("measured");
    expect(chooseBarrelDirection(
      { x: 0, y: 0, z: 1 },
      { x: 0.2, y: 0, z: 1 },
    ).source).toBe("measured");
    expect(chooseBarrelDirection(
      { x: 0, y: 0, z: 1 },
      { x: Number.NaN, y: 0, z: 1 },
    )).toEqual({
      direction: { x: 0, y: 0, z: 1 },
      source: "authored",
      agreement: 0,
    });
  });

  it("returns no measured barrel axis when no mesh probe is available", () => {
    expect(measureProbedBarrelAxis({
      direction: new THREE.Vector3(0, 0, 1),
      start: new THREE.Vector3(0, 0, 0),
      end: new THREE.Vector3(0, 0, 1),
      source: "authored-axis",
    }, new THREE.Vector3(0, 0, 1))).toBeNull();
  });

  it("keeps authored barrel probes measurable after grip-driven scaling", () => {
    const measure = (scale: number) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 1, 4, 4, 32),
        new THREE.MeshBasicMaterial(),
      );
      mesh.scale.setScalar(scale);
      mesh.updateMatrixWorld(true);
      return measureMeshLongitudinalAxis(
        mesh,
        new THREE.Vector3(0, 0, scale * 0.5),
        new THREE.Vector3(0, 0, 1),
      );
    };

    expect(measure(1)).not.toBeNull();
    expect(measure(0.04)).not.toBeNull();
  });

  it("measures a short authored barrel probe within a longer weapon body", () => {
    const root = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.4), new THREE.MeshBasicMaterial());
    body.position.z = -0.3;
    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.02, 0.04, 4, 4, 8),
      new THREE.MeshBasicMaterial(),
    );
    barrel.position.z = -0.016;
    root.add(body, barrel);
    root.updateMatrixWorld(true);

    const measurement = measureMeshLongitudinalAxis(
      root,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -0.0325),
    );

    expect(measurement).not.toBeNull();
    expect(measurement!.direction.dot(new THREE.Vector3(0, 0, 1))).toBeGreaterThan(0.99);
  });

  it("excludes hidden geometry and ignores corners behind the camera", () => {
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
    const hidden = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), new THREE.MeshBasicMaterial());
    hidden.visible = false;
    root.add(hidden);
    expect(visibleWorldBounds(root).getSize(new THREE.Vector3()).x).toBeCloseTo(1);
    expect(worldSpan(root, new THREE.Vector3(1, 0, 0))).toBeCloseTo(1);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 100);
    camera.lookAt(0, 0, -1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const straddling = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial());
    straddling.position.z = -0.02;
    const projection = projectedBounds(straddling, camera);
    expect(projection).not.toBeNull();
    expect(projection!.minDepth).toBeLessThan(camera.near);
    expect(Number.isFinite(projection!.minX)).toBe(true);

    const behind = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial());
    behind.position.z = 1;
    expect(projectedBounds(behind, camera)).toBeNull();
  });
});
