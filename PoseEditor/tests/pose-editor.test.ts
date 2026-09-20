import { describe, expect, it } from "vitest";
import * as THREE from "three/webgpu";
import {
  POSE_EDITOR_ITEMS,
  getPoseEditorItem,
  resolvePoseEditorAnimationMode,
} from "../pose-editor-config";
import { WEAPON_ASSET_DETAILS } from "../../shared/asset-details";
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
} from "../pose-editor-composition";
import {
  alignPoseFrame,
  alignPoseDirection,
  bakeSkinnedMeshesForSoftware,
  findPlacementAnchor,
  hideFirstPersonBodyExceptArms,
  measureMeshLongitudinalAxis,
  measureProbedBarrelAxis,
  placementAnchorPoint,
  projectedBounds,
  visibleWorldBounds,
  worldSpan,
} from "../pose-editor-geometry";
import {
  PLAYER_BODY_FORWARD,
  PLAYER_EYE_FORWARD_OFFSET,
} from "../../client/src/systems/player-visual-calibration";
import {
  applyRifleWeaponPresentation,
  measureLiveRifleFrame,
  prepareRifleHold,
  repositionRifleHands,
  restoreRiflePoseTransaction,
  snapshotRiflePoseTransaction,
} from "../rifle-presentation";

const weaponIds = ["rifle", "pistol", "smg", "shotgun", "lmg", "sniper"] as const;
const utilityIds = ["Grenade", "Flashbang", "Med Kit", "Revive Tool", "Radio", "Signal Jammer", "Proximity Mine", "C4"] as const;

interface RifleFixture {
  character: THREE.Group;
  weapon: THREE.Group;
  left: { shoulder: THREE.Bone; elbow: THREE.Bone; hand: THREE.Bone };
  right: { shoulder: THREE.Bone; elbow: THREE.Bone; hand: THREE.Bone };
  descendants: THREE.Bone[];
  primary: THREE.Object3D;
  support: THREE.Object3D;
  muzzle: THREE.Object3D;
}

interface LocalTransformSnapshot {
  object: THREE.Object3D;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

function captureLocalTransforms(root: THREE.Object3D): LocalTransformSnapshot[] {
  const snapshots: LocalTransformSnapshot[] = [];
  root.traverse((object) => snapshots.push({
    object,
    position: object.position.clone(),
    quaternion: object.quaternion.clone(),
    scale: object.scale.clone(),
  }));
  return snapshots;
}

function expectLocalTransformsRestored(snapshots: LocalTransformSnapshot[]): void {
  for (const snapshot of snapshots) {
    expect(snapshot.object.position).toEqual(snapshot.position);
    expect(snapshot.object.quaternion.angleTo(snapshot.quaternion)).toBeLessThan(1e-8);
    expect(snapshot.object.scale).toEqual(snapshot.scale);
  }
}

function makeRifleFixture(options: {
  missingThumb?: boolean;
  degenerateThumb?: boolean;
  missingAds?: boolean;
  brokenIndexChain?: boolean;
  measuredBarrel?: boolean;
} = {}): RifleFixture {
  const character = new THREE.Group();
  const descendants: THREE.Bone[] = [];

  const makeArm = (side: "Left" | "Right", x: number) => {
    const shoulder = new THREE.Bone();
    shoulder.name = `mixamorig:${side}Arm`;
    shoulder.position.set(x, 1.4, 0);
    const elbow = new THREE.Bone();
    elbow.name = `mixamorig:${side}ForeArm`;
    elbow.position.set(0, -0.25, 0.2);
    const hand = new THREE.Bone();
    hand.name = `mixamorig:${side}Hand`;
    hand.position.set(0, -0.25, 0.2);

    const index = new THREE.Bone();
    index.name = `mixamorig:${side}HandIndex1`;
    index.position.set(0, 0, 0.05);
    const index2 = new THREE.Bone();
    index2.name = `mixamorig:${side}HandIndex2`;
    index2.position.set(0, 0, 0.03);
    const index3 = new THREE.Bone();
    index3.name = `mixamorig:${side}HandIndex3`;
    index3.position.set(0, 0, 0.03);
    const index4 = new THREE.Bone();
    index4.name = `mixamorig:${side}HandIndex4`;
    index4.position.set(0, 0, 0.03);
    if (options.brokenIndexChain) {
      index2.add(index4);
    } else {
      index3.add(index4);
      index2.add(index3);
    }
    index.add(index2);

    const thumb = new THREE.Bone();
    thumb.name = `mixamorig:${side}HandThumb1`;
    thumb.position.set(
      0,
      options.degenerateThumb ? 0 : 0.05,
      options.degenerateThumb ? 0.05 : 0,
    );
    const thumb2 = new THREE.Bone();
    thumb2.name = `mixamorig:${side}HandThumb2`;
    thumb2.position.set(0, 0, 0.02);
    const thumb3 = new THREE.Bone();
    thumb3.name = `mixamorig:${side}HandThumb3`;
    thumb3.position.set(0, 0, 0.02);
    const thumb4 = new THREE.Bone();
    thumb4.name = `mixamorig:${side}HandThumb4`;
    thumb4.position.set(0, 0, 0.02);
    thumb3.add(thumb4);
    thumb2.add(thumb3);
    thumb.add(thumb2);

    if (options.missingThumb) {
      hand.add(index);
    } else {
      hand.add(index, thumb);
    }
    elbow.add(hand);
    shoulder.add(elbow);
    character.add(shoulder);
    descendants.push(index, index2, index3, index4);
    if (!options.missingThumb) descendants.push(thumb, thumb2, thumb3, thumb4);
    return { shoulder, elbow, hand };
  };

  const left = makeArm("Left", -0.15);
  const right = makeArm("Right", 0.15);
  character.updateMatrixWorld(true);

  const weapon = new THREE.Group();
  weapon.add(new THREE.Mesh(
    options.measuredBarrel
      ? new THREE.BoxGeometry(2.4, 0.08, 0.08, 32, 4, 4)
      : new THREE.BoxGeometry(1, 1, 2),
    new THREE.MeshBasicMaterial(),
  ));
  const primary = new THREE.Object3D();
  primary.name = "GripPrimary";
  const support = new THREE.Object3D();
  support.name = "GripSupport";
  support.position.x = -0.3;
    const muzzle = new THREE.Object3D();
    muzzle.name = "Muzzle";
    muzzle.position.x = -0.8;
    const ads = new THREE.Object3D();
    ads.name = "ADSReference";
    ads.position.set(-0.4, 0.05, 0);
    weapon.add(primary, support, muzzle);
    if (!options.missingAds) weapon.add(ads);
  weapon.position.copy(right.hand.getWorldPosition(new THREE.Vector3()));
  character.add(weapon);
  character.updateMatrixWorld(true);
  return { character, weapon, left, right, descendants, primary, support, muzzle };
}

describe("pose editor catalog", () => {
  it("defaults the rifle to static bind pose and keeps animation explicitly opt-in", () => {
    expect(resolvePoseEditorAnimationMode("rifle", null)).toBe("static");
    expect(resolvePoseEditorAnimationMode("rifle", "off")).toBe("static");
    expect(resolvePoseEditorAnimationMode("rifle", "on")).toBe("animated");
    expect(resolvePoseEditorAnimationMode("pistol", null)).toBe("animated");
    expect(resolvePoseEditorAnimationMode("pistol", "off")).toBe("static");
  });

  it("applies one measured rifle frame through a rotated uniform parent", () => {
    const fixture = makeRifleFixture({ measuredBarrel: true });
    fixture.character.rotation.y = 0.35;
    fixture.character.scale.setScalar(1.15);
    fixture.character.updateMatrixWorld(true);
    const beforePrimary = fixture.primary.getWorldPosition(new THREE.Vector3());
    const beforeSupport = fixture.support.getWorldPosition(new THREE.Vector3());
    const beforeScale = fixture.weapon.getWorldScale(new THREE.Vector3());
    const frame = measureLiveRifleFrame(fixture.weapon, "first", "pre-presentation");

    expect(frame).not.toBeNull();
    const predictedForward = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(fixture.character.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();
    const predictedUp = new THREE.Vector3(0, 1, 0)
      .applyQuaternion(fixture.character.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();
    const delta = alignPoseFrame(
      frame!.barrel.direction,
      frame!.adsY.direction,
      predictedForward,
      predictedUp,
    );
    expect(delta).not.toBeNull();
    const handSpan = beforePrimary.distanceTo(beforeSupport);
    const predictedRight = predictedUp.clone().cross(predictedForward).normalize();
    const predictedTranslation = predictedRight.clone().multiplyScalar(-handSpan)
      .addScaledVector(predictedUp, handSpan / 2)
      .addScaledVector(predictedForward, handSpan / 4);
    const expectedPrimary = beforePrimary.clone().add(predictedTranslation);
    const expectedSupport = beforeSupport.clone()
      .sub(beforePrimary)
      .applyQuaternion(delta!)
      .add(beforePrimary)
      .add(predictedTranslation);
    const setWorldPosition = (object: THREE.Object3D, position: THREE.Vector3): void => {
      object.position.copy(object.parent!.worldToLocal(position.clone()));
    };
    setWorldPosition(fixture.right.hand, expectedPrimary);
    setWorldPosition(fixture.left.hand, expectedSupport);
    fixture.character.updateMatrixWorld(true);
    const beforeWeaponChildren = captureLocalTransforms(fixture.weapon).slice(1);
    const beforeLeftHand = fixture.left.hand.getWorldPosition(new THREE.Vector3());
    const beforeRightHand = fixture.right.hand.getWorldPosition(new THREE.Vector3());
    const result = applyRifleWeaponPresentation(fixture.character, fixture.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
      view: "first",
      frame: frame!,
    });

    expect(result.applied).toBe(true);
    expect(result.reason).toContain("measured weapon frame");
    expect(result.sourceFrame?.determinant).toBeCloseTo(1, 6);
    expect(result.targetFrame?.determinant).toBeCloseTo(1, 6);
    expect(result.deltaQuaternion).not.toBeNull();
    const translation = new THREE.Vector3(...result.translation);
    const targetRight = new THREE.Vector3(...result.targetFrame!.right);
    const targetUp = new THREE.Vector3(...result.targetFrame!.up);
    const targetForward = new THREE.Vector3(...result.targetFrame!.forward);
    expect(translation.dot(targetRight)).toBeCloseTo(-result.handSpan, 6);
    expect(translation.dot(targetUp)).toBeCloseTo(result.handSpan / 2, 6);
    expect(translation.dot(targetForward)).toBeCloseTo(result.handSpan / 4, 6);
    expect(fixture.weapon.parent).toBe(fixture.character);
    expect(fixture.weapon.getWorldScale(new THREE.Vector3()).distanceTo(beforeScale)).toBeLessThan(1e-8);
    expect(fixture.primary.getWorldPosition(new THREE.Vector3())
      .distanceTo(beforePrimary.clone().add(new THREE.Vector3(...result.translation)))).toBeLessThan(1e-6);
    expect(fixture.left.hand.getWorldPosition(new THREE.Vector3()).distanceTo(beforeLeftHand)).toBeLessThan(1e-8);
    expect(fixture.right.hand.getWorldPosition(new THREE.Vector3()).distanceTo(beforeRightHand)).toBeLessThan(1e-8);
    beforeWeaponChildren.forEach((snapshot) => {
      expect(snapshot.object.position).toEqual(snapshot.position);
      expect(snapshot.object.quaternion.angleTo(snapshot.quaternion)).toBeLessThan(1e-8);
      expect(snapshot.object.scale).toEqual(snapshot.scale);
    });
    expect(result.postBarrelDirection).not.toBeNull();
    const bodyForward = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(fixture.character.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();
    expect(new THREE.Vector3(...result.postBarrelDirection!).dot(bodyForward)).toBeGreaterThan(1 - 1e-3);
    expect(measureLiveRifleFrame(fixture.weapon, "first", "post-presentation")).not.toBeNull();
  });

  it("rejects measured frame replacement when post-presentation hand contact drifts", () => {
    const fixture = makeRifleFixture({ measuredBarrel: true });
    const beforeCharacter = captureLocalTransforms(fixture.character);
    const beforeWeapon = captureLocalTransforms(fixture.weapon);
    const frame = measureLiveRifleFrame(fixture.weapon, "first", "pre-presentation");

    expect(frame).not.toBeNull();
    const result = applyRifleWeaponPresentation(fixture.character, fixture.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
      view: "first",
      frame: frame!,
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toMatch(/hand contact|hand drift/);
    expect(result.rollbackReason).toMatch(/hand contact|hand drift/);
    expect(result.primaryGripError).toBeGreaterThan(0.035);
    expect(result.supportGripError).toBeGreaterThan(0.035);
    expectLocalTransformsRestored(beforeCharacter);
    expectLocalTransformsRestored(beforeWeapon);
  });

  it("rejects a pre-bake frame after software baking replaces its probe meshes", () => {
    const fixture = makeRifleFixture({ measuredBarrel: true });
    const frame = measureLiveRifleFrame(fixture.weapon, "first", "pre-presentation");

    expect(frame).not.toBeNull();
    expect(bakeSkinnedMeshesForSoftware(fixture.weapon)).toBe(1);
    const postBake = measureLiveRifleFrame(fixture.weapon, "first", "post-bake");
    expect(postBake).not.toBeNull();
    expect(postBake?.barrel.source).toBe("baked-mesh");
    expect(postBake?.barrel.probes.every((probe) => fixture.weapon.getObjectById(probe.mesh.id))).toBe(true);

    const result = applyRifleWeaponPresentation(fixture.character, fixture.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
      view: "first",
      frame: frame!,
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toMatch(/stale/);
  });

  it("rejects missing or stale live frame evidence without mutating the transaction", () => {
    const fixture = makeRifleFixture({ measuredBarrel: true });
    const beforeCharacter = captureLocalTransforms(fixture.character);
    const beforeWeapon = captureLocalTransforms(fixture.weapon);
    const missing = applyRifleWeaponPresentation(fixture.character, fixture.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
      view: "first",
    });
    expect(missing.applied).toBe(false);
    expect(missing.reason).toMatch(/fresh live/);
    expectLocalTransformsRestored(beforeCharacter);
    expectLocalTransformsRestored(beforeWeapon);

    const frame = measureLiveRifleFrame(fixture.weapon, "first", "pre-presentation");
    expect(frame).not.toBeNull();
    const stale = {
      ...frame!,
      barrel: { ...frame!.barrel, direction: frame!.barrel.direction.clone().negate() },
    };
    const staleResult = applyRifleWeaponPresentation(fixture.character, fixture.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
      view: "first",
      frame: stale,
    });
    expect(staleResult.applied).toBe(false);
    expect(staleResult.reason).toMatch(/stale/);
    expectLocalTransformsRestored(beforeCharacter);
    expectLocalTransformsRestored(beforeWeapon);
  });

  it("rejects non-finite caller-supplied frame directions before mutation", () => {
    const fixture = makeRifleFixture({ measuredBarrel: true });
    const frame = measureLiveRifleFrame(fixture.weapon, "first", "pre-presentation");
    const beforeCharacter = captureLocalTransforms(fixture.character);
    const beforeWeapon = captureLocalTransforms(fixture.weapon);

    expect(frame).not.toBeNull();
    frame!.adsY.direction.set(Number.NaN, 0, 0);
    const result = applyRifleWeaponPresentation(fixture.character, fixture.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
      view: "first",
      frame: frame!,
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toMatch(/stale|finite/);
    expectLocalTransformsRestored(beforeCharacter);
    expectLocalTransformsRestored(beforeWeapon);
  });

  it("rejects duplicate authored ADS nodes before frame mutation", () => {
    const fixture = makeRifleFixture({ measuredBarrel: true });
    const duplicate = new THREE.Object3D();
    duplicate.name = "ADSReference";
    fixture.weapon.add(duplicate);
    fixture.character.updateMatrixWorld(true);
    expect(measureLiveRifleFrame(fixture.weapon, "third", "pre-presentation")).toBeNull();
  });

  it("composes only hand-root quaternions and reports post-rotation contact metrics", () => {
    const fixture = makeRifleFixture();
    const beforeWeaponPosition = fixture.weapon.position.clone();
    const beforeWeaponQuaternion = fixture.weapon.quaternion.clone();
    const beforeWeaponScale = fixture.weapon.scale.clone();
    const beforeShoulders = [fixture.left.shoulder, fixture.right.shoulder]
      .map((bone) => ({ position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone() }));
    const beforeElbows = [fixture.left.elbow, fixture.right.elbow]
      .map((bone) => ({ position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone() }));
    const beforeOrigins = [fixture.left.hand, fixture.right.hand]
      .map((hand) => hand.getWorldPosition(new THREE.Vector3()));
    const beforeDescendants = fixture.descendants.map((bone) => ({
      position: bone.position.clone(),
      quaternion: bone.quaternion.clone(),
      scale: bone.scale.clone(),
    }));
    const separationAxis = fixture.right.hand.getWorldPosition(new THREE.Vector3())
      .sub(fixture.left.hand.getWorldPosition(new THREE.Vector3()))
      .normalize();
    const handAxis = separationAxis.clone().negate();
    const bodyUp = new THREE.Vector3(0, 1, 0)
      .transformDirection(fixture.character.matrixWorld)
      .normalize();
    const bodyForward = new THREE.Vector3(0, 0, 1)
      .transformDirection(fixture.character.matrixWorld)
      .normalize()
      .addScaledVector(bodyUp, 0.12)
      .normalize();
    bodyForward.addScaledVector(separationAxis, -bodyForward.dot(separationAxis)).normalize();
    const palmAxis = bodyForward.clone().cross(separationAxis).normalize();
    const expectedWorldQuaternions = [fixture.left.hand, fixture.right.hand].map((hand) => {
      const origin = hand.getWorldPosition(new THREE.Vector3());
      const index = hand.children.find((child) => /Index1$/.test(child.name))!;
      const thumb = hand.children.find((child) => /Thumb1$/.test(child.name))!;
      const measuredY = index.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
      const measuredZ = measuredY.clone()
        .cross(thumb.getWorldPosition(new THREE.Vector3()).sub(origin).normalize())
        .normalize();
      const measuredX = measuredY.clone().cross(measuredZ).normalize();
      const measured = new THREE.Quaternion()
        .setFromRotationMatrix(new THREE.Matrix4().makeBasis(measuredX, measuredY, measuredZ))
        .normalize();
      const desiredPalmNormal = hand.name.includes("Left")
        ? palmAxis.clone().negate()
        : palmAxis.clone();
      const target = new THREE.Quaternion()
        .setFromRotationMatrix(new THREE.Matrix4().makeBasis(
          handAxis.clone().cross(desiredPalmNormal),
          handAxis,
          desiredPalmNormal,
        ))
        .normalize();
      return target.clone()
        .multiply(measured.clone().invert())
        .multiply(hand.getWorldQuaternion(new THREE.Quaternion()))
        .normalize();
    });

    const result = repositionRifleHands(fixture.character, fixture.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
      wristTwist: 0,
      fingerCurl: 0,
      fingerCurlAxis: "x",
    });

    expect(result.applied).toBe(true);
    expect(result.handFrameApplied).toBe(true);
    expect(result.primaryGripError).toBeLessThan(1e-8);
    expect(result.supportGripError).toBeLessThan(1e-8);
    expect(fixture.left.hand.getWorldQuaternion(new THREE.Quaternion()).angleTo(expectedWorldQuaternions[0])).toBeLessThan(1e-6);
    expect(fixture.right.hand.getWorldQuaternion(new THREE.Quaternion()).angleTo(expectedWorldQuaternions[1])).toBeLessThan(1e-6);
    expect(fixture.left.hand.getWorldPosition(new THREE.Vector3()).distanceTo(beforeOrigins[0])).toBeLessThan(1e-8);
    expect(fixture.right.hand.getWorldPosition(new THREE.Vector3()).distanceTo(beforeOrigins[1])).toBeLessThan(1e-8);
    expect(fixture.weapon.position).toEqual(beforeWeaponPosition);
    expect(fixture.weapon.quaternion.angleTo(beforeWeaponQuaternion)).toBeLessThan(1e-8);
    expect(fixture.weapon.scale).toEqual(beforeWeaponScale);
    [fixture.left.shoulder, fixture.right.shoulder].forEach((bone, index) => {
      expect(bone.position).toEqual(beforeShoulders[index].position);
      expect(bone.quaternion.angleTo(beforeShoulders[index].quaternion)).toBeLessThan(1e-8);
      expect(bone.scale).toEqual(beforeShoulders[index].scale);
    });
    [fixture.left.elbow, fixture.right.elbow].forEach((bone, index) => {
      expect(bone.position).toEqual(beforeElbows[index].position);
      expect(bone.quaternion.angleTo(beforeElbows[index].quaternion)).toBeLessThan(1e-8);
      expect(bone.scale).toEqual(beforeElbows[index].scale);
    });
    fixture.descendants.forEach((bone, index) => {
      expect(bone.position).toEqual(beforeDescendants[index].position);
      expect(bone.quaternion.angleTo(beforeDescendants[index].quaternion)).toBeLessThan(1e-8);
      expect(bone.scale).toEqual(beforeDescendants[index].scale);
    });
    expect(result.diagnostics?.valid).toBe(true);
    expect(result.diagnostics?.postRotation.left.index.joints).toHaveLength(4);
    expect(result.diagnostics?.postRotation.right.thumb.joints).toHaveLength(4);
    expect(Number.isFinite(result.diagnostics?.postRotation.left.index.terminalEndpointDistance)).toBe(true);
    expect(result.diagnostics?.postRotation.left.index.longitudinalProjections).toHaveLength(4);
    expect(result.diagnostics?.postRotation.left.index.monotonic).toBe(true);
    expect(result.diagnostics?.orderingPreserved).toBe(true);
    expect(result.diagnostics?.radialErrorsWithinTolerance).toBe(true);
  });

  it("keeps rifle transforms fixed across views and rejects invalid or unsupported states", () => {
    const first = makeRifleFixture();
    const firstWeapon = {
      position: first.weapon.position.clone(),
      quaternion: first.weapon.quaternion.clone(),
      scale: first.weapon.scale.clone(),
      barrel: first.muzzle.getWorldPosition(new THREE.Vector3())
        .sub(first.primary.getWorldPosition(new THREE.Vector3())).normalize(),
    };
    const firstResult = repositionRifleHands(first.character, first.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
      view: "first",
    });
    expect(firstResult.view).toBe("first");
    expect(first.muzzle.getWorldPosition(new THREE.Vector3())
      .sub(first.primary.getWorldPosition(new THREE.Vector3())).normalize()).toEqual(firstWeapon.barrel);
    expect(first.weapon.position).toEqual(firstWeapon.position);
    expect(first.weapon.quaternion.angleTo(firstWeapon.quaternion)).toBeLessThan(1e-8);
    expect(first.weapon.scale).toEqual(firstWeapon.scale);

    const third = makeRifleFixture();
    const thirdWeaponQuaternion = third.weapon.quaternion.clone();
    const thirdResult = repositionRifleHands(third.character, third.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
      view: "third",
    });
    expect(thirdResult.view).toBe("third");
    expect(third.weapon.quaternion.angleTo(thirdWeaponQuaternion)).toBeLessThan(1e-8);

    const bounded = makeRifleFixture();
    const boundedWeaponPosition = bounded.weapon.position.clone();
    const boundedWeaponScale = bounded.weapon.scale.clone();
    const boundedWeaponQuaternion = bounded.weapon.quaternion.clone();
    const descendantQuaternions = bounded.descendants.map((bone) => bone.quaternion.clone());
    const boundedResult = repositionRifleHands(bounded.character, bounded.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
      wristTwist: 99,
      fingerCurl: 99,
      fingerCurlAxis: "z",
    });
    expect(boundedResult.wristTwist).toBe(Math.PI / 2);
    expect(boundedResult.fingerCurl).toBe(Math.PI / 2);
    bounded.descendants.forEach((bone, index) => expect(bone.quaternion.angleTo(descendantQuaternions[index])).toBeLessThan(1e-8));
    expect(bounded.weapon.position).toEqual(boundedWeaponPosition);
    expect(bounded.weapon.scale).toEqual(boundedWeaponScale);
    expect(bounded.weapon.quaternion.angleTo(boundedWeaponQuaternion)).toBeLessThan(1e-8);

    const rollback = makeRifleFixture();
    const rollbackIndexRoots = [rollback.descendants[0], rollback.descendants[8]];
    const rollbackIndexSegments = [rollback.descendants[1], rollback.descendants[9]];
    const beforeRollbackHands = [rollback.left.hand, rollback.right.hand]
      .map((hand) => hand.quaternion.clone());
    const beforeRollbackWeapon = captureLocalTransforms(rollback.weapon);
    const beforeRollbackWeaponParent = rollback.weapon.parent;
    const beforeRollbackWeaponPosition = rollback.weapon.position.clone();
    const beforeRollbackWeaponQuaternion = rollback.weapon.quaternion.clone();
    const beforeRollbackWeaponScale = rollback.weapon.scale.clone();
    rollbackIndexRoots.forEach((root, index) => {
      root.position.set(0.01, 0, 0.05);
      rollbackIndexSegments[index].position.set(-0.0313, -0.0787, 0.1582);
    });
    const beforeRollbackArms = captureLocalTransforms(rollback.character);
    rollback.character.updateMatrixWorld(true);
    const rollbackResult = repositionRifleHands(rollback.character, rollback.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
    });
    expect(rollbackResult.applied).toBe(false);
    expect(rollbackResult.reason).toMatch(/rollback/);
    expect(rollbackResult.diagnostics?.postRotation).not.toBeNull();
    expect(rollbackResult.diagnostics?.contactWithinTolerance).toBe(false);
    expect(rollback.left.hand.quaternion.angleTo(beforeRollbackHands[0])).toBeLessThan(1e-8);
    expect(rollback.right.hand.quaternion.angleTo(beforeRollbackHands[1])).toBeLessThan(1e-8);
    expectLocalTransformsRestored(beforeRollbackArms);
    expectLocalTransformsRestored(beforeRollbackWeapon);
    expect(rollback.weapon.parent).toBe(beforeRollbackWeaponParent);
    expect(rollback.weapon.position).toEqual(beforeRollbackWeaponPosition);
    expect(rollback.weapon.quaternion.angleTo(beforeRollbackWeaponQuaternion)).toBeLessThan(1e-8);
    expect(rollback.weapon.scale).toEqual(beforeRollbackWeaponScale);

    const missing = makeRifleFixture({ missingThumb: true });
    const missingQuaternion = missing.right.hand.quaternion.clone();
    const missingResult = repositionRifleHands(missing.character, missing.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
    });
    expect(missingResult.applied).toBe(false);
    expect(missingResult.reason).toMatch(/Index1\/Thumb1|unavailable/);
    expect(missing.right.hand.quaternion.angleTo(missingQuaternion)).toBeLessThan(1e-8);

    const degenerate = makeRifleFixture({ degenerateThumb: true });
    const degenerateQuaternion = degenerate.left.hand.quaternion.clone();
    const degenerateResult = repositionRifleHands(degenerate.character, degenerate.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
    });
    expect(degenerateResult.applied).toBe(false);
    expect(degenerateResult.reason).toMatch(/degenerate/);
    expect(degenerate.left.hand.quaternion.angleTo(degenerateQuaternion)).toBeLessThan(1e-8);

    const unsupported = makeRifleFixture();
    const unsupportedHandQuaternion = unsupported.left.hand.quaternion.clone();
    const unsupportedWeaponQuaternion = unsupported.weapon.quaternion.clone();
    const unsupportedResult = repositionRifleHands(unsupported.character, unsupported.weapon, {
      weaponId: "pistol",
      clipName: "rifle_idle",
      view: "third",
      wristTwist: 1,
    });
    expect(unsupportedResult.applied).toBe(false);
    expect(unsupportedResult.reason).toMatch(/unsupported/);
    expect(unsupported.left.hand.quaternion.angleTo(unsupportedHandQuaternion)).toBeLessThan(1e-8);
    expect(unsupported.weapon.quaternion.angleTo(unsupportedWeaponQuaternion)).toBeLessThan(1e-8);

    const missingAds = makeRifleFixture({ missingAds: true });
    const missingAdsResult = repositionRifleHands(missingAds.character, missingAds.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
    });
    expect(missingAdsResult.applied).toBe(false);
    expect(missingAdsResult.reason).toMatch(/authored.*anchor|provenance/i);

    const brokenChain = makeRifleFixture({ brokenIndexChain: true });
    const brokenChainResult = repositionRifleHands(brokenChain.character, brokenChain.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
    });
    expect(brokenChainResult.applied).toBe(false);
    expect(brokenChainResult.reason).toMatch(/contiguous|chain|unavailable/i);
  });

  it("proves terminal finger distance cannot be repaired by a hand-root rotation", () => {
    const fixture = makeRifleFixture();
    const terminal = fixture.left.hand.getObjectByName("mixamorig:LeftHandThumb4")!;
    terminal.position.y += 0.2;
    fixture.character.updateMatrixWorld(true);
    const beforeTerminal = terminal.getWorldPosition(new THREE.Vector3())
      .distanceTo(fixture.left.hand.getWorldPosition(new THREE.Vector3()));
    const beforeHands = [fixture.left.hand, fixture.right.hand].map((hand) => hand.quaternion.clone());
    const beforeCharacter = captureLocalTransforms(fixture.character);

    const result = repositionRifleHands(fixture.character, fixture.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
    });

    expect(beforeTerminal).toBeGreaterThan(0.16);
    expect(result.applied).toBe(false);
    expect(result.reason).toMatch(/rollback/);
    expect(result.diagnostics?.contactWithinTolerance).toBe(false);
    expect(result.diagnostics?.preRotation.left.thumb.terminalEndpointDistance)
      .toBeCloseTo(beforeTerminal, 8);
    expect(result.diagnostics?.postRotation?.left.thumb.terminalEndpointDistance)
      .toBeCloseTo(beforeTerminal, 8);
    expect(fixture.left.hand.quaternion.angleTo(beforeHands[0])).toBeLessThan(1e-8);
    expect(fixture.right.hand.quaternion.angleTo(beforeHands[1])).toBeLessThan(1e-8);
    expectLocalTransformsRestored(beforeCharacter);
  });

  it("converts the measured target frame through a rotated character parent", () => {
    const fixture = makeRifleFixture();
    const parent = new THREE.Group();
    parent.position.set(0.7, -0.4, 1.1);
    parent.quaternion
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.6)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.2))
      .normalize();
    parent.add(fixture.character);
    parent.updateMatrixWorld(true);
    const beforeOrigins = [fixture.left.hand, fixture.right.hand]
      .map((hand) => hand.getWorldPosition(new THREE.Vector3()));
    const beforeLocalHands = [fixture.left.hand, fixture.right.hand].map((hand) => ({
      position: hand.position.clone(),
      scale: hand.scale.clone(),
    }));
    const separationAxis = beforeOrigins[1].clone().sub(beforeOrigins[0]).normalize();
    const expectedHandAxis = separationAxis.clone().negate();

    const result = repositionRifleHands(fixture.character, fixture.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
    });

    expect(result.applied).toBe(true);
    expect(result.diagnostics?.valid).toBe(true);
    [fixture.left.hand, fixture.right.hand].forEach((hand, index) => {
      expect(hand.getWorldPosition(new THREE.Vector3()).distanceTo(beforeOrigins[index])).toBeLessThan(1e-8);
      expect(hand.position).toEqual(beforeLocalHands[index].position);
      expect(hand.scale).toEqual(beforeLocalHands[index].scale);
      const indexRoot = hand.children.find((child) => /Index1$/.test(child.name))!;
      const indexDirection = indexRoot.getWorldPosition(new THREE.Vector3())
        .sub(hand.getWorldPosition(new THREE.Vector3()))
        .normalize();
      expect(indexDirection.angleTo(expectedHandAxis)).toBeLessThan(1e-6);
    });
  });

  it("does not partially mutate either hand when the second frame is degenerate", () => {
    const fixture = makeRifleFixture();
    const rightThumbRoot = fixture.right.hand.getObjectByName("mixamorig:RightHandThumb1")!;
    rightThumbRoot.position.set(0, 0, 0);
    fixture.character.updateMatrixWorld(true);
    const beforeHands = [fixture.left.hand, fixture.right.hand].map((hand) => hand.quaternion.clone());
    const beforeCharacter = captureLocalTransforms(fixture.character);
    const beforeWeapon = captureLocalTransforms(fixture.weapon);

    const result = repositionRifleHands(fixture.character, fixture.weapon, {
      weaponId: "rifle",
      clipName: "rifle_idle",
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toMatch(/degenerate/);
    expect(fixture.left.hand.quaternion.angleTo(beforeHands[0])).toBeLessThan(1e-8);
    expect(fixture.right.hand.quaternion.angleTo(beforeHands[1])).toBeLessThan(1e-8);
    expectLocalTransformsRestored(beforeCharacter);
    expectLocalTransformsRestored(beforeWeapon);
  });

  it("leaves a malformed rifle arm hierarchy unchanged", () => {
    const character = new THREE.Group();
    const hand = new THREE.Bone();
    hand.name = "mixamorig:LeftHand";
    character.add(hand);
    const weapon = new THREE.Group();
    expect(repositionRifleHands(character, weapon).applied).toBe(false);
  });

  it("restores an unparented solver transaction without partial arm or weapon state", () => {
    const fixture = makeRifleFixture();
    fixture.weapon.removeFromParent();
    fixture.character.updateMatrixWorld(true);
    fixture.weapon.updateMatrixWorld(true);

    const beforeCharacter = captureLocalTransforms(fixture.character);
    const beforeWeapon = captureLocalTransforms(fixture.weapon);
    const transaction = snapshotRiflePoseTransaction(fixture.character, fixture.weapon);

    fixture.left.shoulder.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.35);
    fixture.left.elbow.position.x += 0.2;
    fixture.left.hand.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.2);
    fixture.character.add(fixture.weapon);
    fixture.weapon.position.set(0.4, -0.2, 0.7);
    fixture.weapon.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.6);
    fixture.weapon.scale.setScalar(1.7);
    fixture.character.updateMatrixWorld(true);

    restoreRiflePoseTransaction(transaction, fixture.character, fixture.weapon);

    expect(fixture.weapon.parent).toBeNull();
    expectLocalTransformsRestored(beforeCharacter);
    expectLocalTransformsRestored(beforeWeapon);
  });

  it("restores a manually managed weapon matrix during transaction rollback", () => {
    const fixture = makeRifleFixture();
    fixture.weapon.matrixAutoUpdate = false;
    fixture.weapon.matrix.makeTranslation(0.2, 0.3, -0.4);
    fixture.weapon.matrixWorldNeedsUpdate = true;
    fixture.character.updateMatrixWorld(true);
    const beforeLocalMatrix = fixture.weapon.matrix.clone();
    const beforeWorldMatrix = fixture.weapon.matrixWorld.clone();
    const transaction = snapshotRiflePoseTransaction(fixture.character, fixture.weapon);

    fixture.weapon.matrix.makeRotationY(0.6);
    fixture.weapon.matrixWorldNeedsUpdate = true;
    fixture.character.updateMatrixWorld(true);
    restoreRiflePoseTransaction(transaction, fixture.character, fixture.weapon);

    expect(fixture.weapon.matrix.elements).toEqual(beforeLocalMatrix.elements);
    expect(fixture.weapon.matrixWorld.elements).toEqual(beforeWorldMatrix.elements);
  });

  it("does not leave a partial left-arm hold when the right arm cannot solve", () => {
    const fixture = makeRifleFixture();
    fixture.right.elbow.position.set(0, 0, 0);
    fixture.right.hand.position.set(0, 0, 0);
    fixture.character.updateMatrixWorld(true);
    const beforeCharacter = captureLocalTransforms(fixture.character);

    const result = prepareRifleHold(fixture.character, {
      weaponId: "rifle",
      clipName: "rifle_idle",
      view: "first",
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toMatch(/unreachable|contact|hold target/i);
    expectLocalTransformsRestored(beforeCharacter);
  });

  it("keeps the static rifle hold targets reachable in both intended views", () => {
    for (const view of ["first", "third"] as const) {
      const fixture = makeRifleFixture();
      const result = prepareRifleHold(fixture.character, {
        weaponId: "rifle",
        clipName: "rifle_idle",
        view,
      });

      expect(result.applied).toBe(true);
      expect(result.leftError).toBeLessThan(0.035);
      expect(result.rightError).toBeLessThan(0.035);
    }
  });

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

describe("first-person body presentation", () => {
  it("keeps lower-arm contact geometry and hides upper-body meshes", () => {
    const root = new THREE.Group();
    const forearm = new THREE.Bone();
    forearm.name = "mixamorig:LeftForeArm";
    const upperArm = new THREE.Bone();
    upperArm.name = "mixamorig:LeftArm";
    const torso = new THREE.Bone();
    torso.name = "mixamorig:Spine";
    root.add(forearm, upperArm, torso);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([
      -1, 0, 0, 1, 0, 0, 0, 1, 0,
      -1, 0, 1, 1, 0, 1, 0, 1, 1,
      -1, 0, 2, 1, 0, 2, 0, 1, 2,
    ], 3));
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
      2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0,
    ], 4));
    geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute([
      1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
      1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
      1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
    ], 4));
    geometry.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const skinned = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    skinned.bind(new THREE.Skeleton([forearm, upperArm, torso]));
    root.add(skinned);
    const characterOnlyMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    root.add(characterOnlyMesh);
    const heldItem = new THREE.Group();
    const heldItemMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    heldItem.add(heldItemMesh);
    root.add(heldItem);
    root.updateMatrixWorld(true);

    const result = hideFirstPersonBodyExceptArms(root, heldItem);

    expect(result.hiddenTriangles).toBe(2);
    expect(result.sourceTriangles).toBe(3);
    expect(skinned.geometry.getIndex()?.count).toBe(3);
    expect(skinned.userData.poseEditorVisibleIndices).toEqual([0, 1, 2]);
    expect(visibleWorldBounds(skinned).getSize(new THREE.Vector3()).z).toBeCloseTo(0);
    expect(characterOnlyMesh.visible).toBe(false);
    expect(heldItemMesh.visible).toBe(true);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 100);
    camera.position.set(0, 0, 2);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const projection = projectedBounds(skinned, camera, true);
    expect(projection).not.toBeNull();
    expect(projection!.minDepth).toBeCloseTo(2);
  });
});
