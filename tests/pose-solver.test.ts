import { describe, expect, it, vi } from "vitest";
import * as THREE from "three/webgpu";
import {
  chooseVerifiedGripPose,
  resolveGripAnchors,
  solveVerifiedGripPose,
} from "../client/weapons/pose-solver";
import { normalizeGameplayPlayerModel } from "../client/src/systems/player-visual-calibration";
import {
  disposeOwnedRemoteResources,
  shouldReplaceRemotePlayerWeapon,
  shouldShowRemotePlayerWeapon,
} from "../client/src/systems/RemotePlayerSystem";
import { NetworkSyncSystem } from "../client/src/systems/NetworkSyncSystem";
import { WEAPON_ASSET_DETAILS } from "../shared/asset-details";

function addBone(parent: THREE.Object3D, name: string, position: readonly [number, number, number]): THREE.Bone {
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.set(...position);
  parent.add(bone);
  return bone;
}

function createCharacter(includeTorso = true): THREE.Group {
  const character = new THREE.Group();
  const leftShoulder = addBone(character, "mixamorig:LeftShoulder", [0, 1.4, 0]);
  const leftElbow = addBone(leftShoulder, "mixamorig:LeftForeArm", [0, -0.25, -0.15]);
  addBone(leftElbow, "mixamorig:LeftHand", [0, -0.15, -0.25]);

  const rightShoulder = addBone(character, "mixamorig:RightShoulder", [0, 1.4, 0]);
  const rightElbow = addBone(rightShoulder, "mixamorig:RightForeArm", [0, -0.25, -0.05]);
  addBone(rightElbow, "mixamorig:RightHand", [0, -0.15, 0.05]);
  if (includeTorso) addTorsoBones(character);
  character.updateMatrixWorld(true);
  return character;
}

function createArmAliasCharacter(): THREE.Group {
  const character = new THREE.Group();
  const leftShoulder = addBone(character, "arm_left_top", [0, 1.4, 0]);
  const leftElbow = addBone(leftShoulder, "arm_left_bot", [0, -0.25, -0.15]);
  addBone(leftElbow, "arm_left_hand", [0, -0.15, -0.25]);

  const rightShoulder = addBone(character, "arm_right_top", [0, 1.4, 0]);
  const rightElbow = addBone(rightShoulder, "arm_right_bot", [0, -0.25, -0.05]);
  addBone(rightElbow, "arm_right_hand", [0, -0.15, 0.05]);
  addTorsoBones(character);
  character.updateMatrixWorld(true);
  return character;
}

function addTorsoBones(character: THREE.Object3D): void {
  for (const [name, position] of [
    ["Hips", [0.5, 0.9, 0]],
    ["Spine", [0.5, 1.05, 0]],
    ["Spine1", [0.5, 1.2, 0]],
    ["Spine2", [0.5, 1.35, 0]],
    ["Neck", [0.5, 1.5, 0]],
    ["Head", [0.5, 1.65, 0]],
  ] as const) addBone(character, name, position);
  character.updateMatrixWorld(true);
}

function createWeapon(includeBody = true): THREE.Group {
  const weapon = new THREE.Group();
  const support = new THREE.Object3D();
  support.name = "GripSupport";
  const primary = new THREE.Object3D();
  primary.name = "GripPrimary";
  primary.position.y = 1;
  const muzzle = new THREE.Object3D();
  muzzle.name = "Muzzle";
  muzzle.position.y = -1;
  const ads = new THREE.Object3D();
  ads.name = "ADSReference";
  ads.position.z = 1;
  weapon.add(support, primary, muzzle, ads);
  if (includeBody) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), new THREE.MeshBasicMaterial());
    body.position.y = 0.2;
    weapon.add(body);
  } else {
    // Keep authored socket bounds available while excluding the body from clipping checks.
    const boundsOnly = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), new THREE.MeshBasicMaterial());
    boundsOnly.position.y = 0.2;
    boundsOnly.visible = false;
    weapon.add(boundsOnly);
  }
  weapon.updateMatrixWorld(true);
  return weapon;
}

function createProceduralWeapon(): THREE.Group {
  const weapon = new THREE.Group();
  weapon.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 2, 0.2),
    new THREE.MeshBasicMaterial(),
  ));
  weapon.updateMatrixWorld(true);
  return weapon;
}

function createMetadataAxisWeapon(reversed: boolean): THREE.Group {
  const weapon = new THREE.Group();
  const support = new THREE.Object3D();
  support.name = "GripSupport";
  support.position.x = -0.5;
  const primary = new THREE.Object3D();
  primary.name = "GripPrimary";
  primary.position.x = 0.5;
  const muzzle = new THREE.Object3D();
  muzzle.name = "Muzzle";
  muzzle.position.x = -1.1;
  muzzle.rotation.z = reversed ? -Math.PI / 2 : Math.PI / 2;
  const ads = new THREE.Object3D();
  ads.name = "ADSReference";
  ads.position.x = 0.5;
  ads.position.y = 0.3;
  weapon.add(support, primary, muzzle, ads);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 0.3), new THREE.MeshBasicMaterial());
  body.visible = false;
  weapon.add(body);
  weapon.updateMatrixWorld(true);
  return weapon;
}

function createUnscaledPlayerVisual(): THREE.Group {
  const player = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), new THREE.MeshBasicMaterial());
  mesh.position.y = 1;
  player.add(mesh);
  player.updateMatrixWorld(true);
  return player;
}

function createSmgWithCompetingMuzzleCandidates(): THREE.Group {
  const weapon = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1, 0.2),
    new THREE.MeshBasicMaterial(),
  );
  body.position.x = -1;
  weapon.add(body);

  const primary = new THREE.Object3D();
  primary.name = "GripPrimary";
  primary.position.set(0.8, 0, 0);
  weapon.add(primary);

  const support = new THREE.Object3D();
  support.name = "GripSupport";
  support.position.set(-0.8, 0, 0);
  weapon.add(support);

  const invalidMuzzle = new THREE.Object3D();
  invalidMuzzle.name = "Muzzle";
  invalidMuzzle.position.set(0.8, 0.8, 0);
  weapon.add(invalidMuzzle);

  const validMuzzle = new THREE.Object3D();
  validMuzzle.name = "UMP_Muzzle";
  validMuzzle.position.set(-1.2, 0, 0);
  validMuzzle.rotation.z = Math.PI / 2;
  weapon.add(validMuzzle);

  const ads = new THREE.Object3D();
  ads.name = "ADSReference";
  ads.position.set(0.8, 0.5, 0);
  weapon.add(ads);
  weapon.updateMatrixWorld(true);
  return weapon;
}

describe("verified player weapon pose solver", () => {
  it("normalizes the imported player visual to the gameplay height and feet origin", () => {
    const player = createUnscaledPlayerVisual();

    const scale = normalizeGameplayPlayerModel(player);

    const bounds = new THREE.Box3().setFromObject(player);
    expect(scale).toBeCloseTo(0.45, 8);
    expect(bounds.min.y).toBeCloseTo(0, 8);
    expect(bounds.max.y).toBeCloseTo(1.8, 8);
  });

  it("prefers valid authored grip nodes and falls back when an authored node is invalid", () => {
    const weapon = createWeapon();
    const authored = resolveGripAnchors(weapon, "rifle");
    expect(authored.primary.source).toBe("authored");
    expect(authored.support.source).toBe("authored");
    expect(authored.muzzle.source).toBe("authored");

    const invalidPrimary = weapon.getObjectByName("GripPrimary")!;
    invalidPrimary.position.set(Number.NaN, Number.NaN, Number.NaN);
    weapon.updateMatrixWorld(true);
    const fallback = resolveGripAnchors(weapon, "rifle");
    expect(fallback.primary.source).not.toBe("authored");
    expect(fallback.primary.point.toArray().every(Number.isFinite)).toBe(true);

    invalidPrimary.position.set(100, 100, 100);
    weapon.updateMatrixWorld(true);
    const outOfBounds = resolveGripAnchors(weapon, "rifle");
    expect(outOfBounds.primary.source).not.toBe("authored");
    expect(outOfBounds.primary.point.toArray().every(Number.isFinite)).toBe(true);
  });

  it("does not assign one socket node to both grip anchors", () => {
    const weapon = createWeapon();
    weapon.getObjectByName("GripPrimary")!.position.set(Number.NaN, Number.NaN, Number.NaN);
    weapon.updateMatrixWorld(true);

    const anchors = resolveGripAnchors(weapon, "rifle");

    expect(anchors.support.nodeName).toBe("GripSupport");
    expect(anchors.primary.nodeName).not.toBe(anchors.support.nodeName);
    expect(anchors.primary.source).toBe("procedural");
  });

  it("recognizes the authored rifle tag naming used by the bundled asset", () => {
    const weapon = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 2, 0.2),
      new THREE.MeshBasicMaterial(),
    );
    weapon.add(mesh);
    for (const [name, position] of [
      ["tag_trigger_0223", [0, 0.8, 0]],
      ["foregrip_socket_0232", [0, 0.1, 0]],
      ["tag_muzzle_0222", [0, -0.8, 0]],
      ["EXPS3_Socket_0225", [0, 0.8, 0.2]],
    ] as const) {
      const node = new THREE.Object3D();
      node.name = name;
      node.position.set(position[0], position[1], position[2]);
      weapon.add(node);
    }
    const anchors = resolveGripAnchors(weapon, "rifle");

    expect(anchors.primary.source).toBe("candidate");
    expect(anchors.support.source).toBe("candidate");
    expect(anchors.muzzle.source).toBe("candidate");
    expect(anchors.ads.source).toBe("candidate");
  });

  it("recognizes the SCAR-L combat grip support alias", () => {
    const weapon = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 2, 0.2),
      new THREE.MeshBasicMaterial(),
    );
    weapon.add(mesh);
    for (const [name, position] of [
      ["tag_trigger_0223", [0, 0.8, 0]],
      ["combat_grip_0233", [0, 0.1, 0]],
      ["tag_muzzle_0222", [0, -0.8, 0]],
      ["EXPS3_Socket_0225", [0, 0.8, 0.2]],
    ] as const) {
      const node = new THREE.Object3D();
      node.name = name;
      node.position.set(position[0], position[1], position[2]);
      weapon.add(node);
    }

    const anchors = resolveGripAnchors(weapon, "rifle");

    expect(anchors.support.source).toBe("candidate");
    expect(anchors.support.nodeName).toBe("combat_grip_0233");
  });

  it("rejects an invalid generic SMG muzzle in favor of the aligned UMP muzzle candidate", () => {
    const anchors = resolveGripAnchors(createSmgWithCompetingMuzzleCandidates(), "smg");

    expect(anchors.muzzle.source).toBe("candidate");
    expect(anchors.muzzle.nodeName).toBe("UMP_Muzzle");
    expect(anchors.muzzle.direction?.x).toBeCloseTo(-1, 8);
    expect(anchors.muzzle.direction?.y).toBeCloseTo(0, 8);
    expect(anchors.muzzle.direction?.z).toBeCloseTo(0, 8);
  });

  it("uses the validated authored UMP axis when solving the SMG pose", () => {
    const character = createCharacter();
    const weapon = createSmgWithCompetingMuzzleCandidates();
    weapon.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) child.visible = false;
    });

    const result = solveVerifiedGripPose(character, weapon, { weaponId: "smg" });

    expect(result.solved).toBe(true);
    expect(result.socketNodes.muzzle).toBe("UMP_Muzzle");
    expect(result.muzzleDirectionError).toBeLessThan(0.001);
  });

  it("uses point-derived alignment to skip an invalid first muzzle without metadata", () => {
    const anchors = resolveGripAnchors(createSmgWithCompetingMuzzleCandidates(), "rifle");

    expect(anchors.muzzle.nodeName).toBe("UMP_Muzzle");
    expect(anchors.muzzle.source).toBe("candidate");
  });

  it("aligns both grips and the muzzle to the animated two-hand rifle pose", () => {
    const character = createCharacter();
    const weapon = createWeapon();
    const result = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(result.solved).toBe(true);
    expect(result.primaryGripError).toBeLessThan(0.0001);
    expect(result.supportGripError).toBeLessThan(0.0001);
    expect(result.muzzleDirectionError).toBeLessThan(0.001);
    expect(result.weaponScale).toBeCloseTo(0.4, 5);
    expect(result.clipping.weaponBody).toBe(false);
  });

  it("uses the signed hand axis for muzzle alignment instead of forcing body forward", () => {
    const character = createCharacter();
    character.getObjectByName("mixamorig:LeftHand")!.position.x = -0.4;
    character.getObjectByName("mixamorig:RightHand")!.position.x = 0.4;
    character.updateMatrixWorld(true);

    const result = solveVerifiedGripPose(character, createWeapon(false), { weaponId: "rifle" });

    expect(result.solved).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.muzzleDirectionError).toBeLessThan(0.001);
    expect(result.shoulderAlignmentError).toBeGreaterThan(0.35);
  });

  it("fails closed when a procedural muzzle has no independent direction metadata", () => {
    const character = createCharacter();
    const weapon = createProceduralWeapon();
    const result = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(result.solved).toBe(true);
    expect(result.muzzleDirectionTrusted).toBe(false);
    expect(result.reason).toBe("missing trusted muzzle direction");
    expect(result.verified).toBe(false);
  });

  it("rejects a reversed authored muzzle axis while accepting its mirrored counterpart", () => {
    const valid = solveVerifiedGripPose(createCharacter(), createMetadataAxisWeapon(false), { weaponId: "smg" });
    const reversed = solveVerifiedGripPose(createCharacter(), createMetadataAxisWeapon(true), { weaponId: "smg" });

    expect(valid.solved).toBe(true);
    expect(valid.muzzleDirectionTrusted).toBe(true);
    expect(valid.muzzleDirectionError).toBeLessThan(0.001);
    expect(reversed.solved).toBe(false);
    expect(reversed.reason).toBe("invalid authored muzzle axis");
  });

  it("fails safely for a degenerate hand span without producing NaN transforms", () => {
    const character = createCharacter();
    const leftHand = character.getObjectByName("mixamorig:LeftHand")!;
    const rightHand = character.getObjectByName("mixamorig:RightHand")!;
    const leftWorld = new THREE.Vector3();
    leftHand.getWorldPosition(leftWorld);
    rightHand.position.copy(rightHand.parent!.worldToLocal(leftWorld));
    character.updateMatrixWorld(true);
    const weapon = createWeapon();
    const result = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(result.solved).toBe(false);
    expect(result.reason).toContain("hand span");
    expect(weapon.position.toArray().every(Number.isFinite)).toBe(true);
    expect(weapon.quaternion.toArray().every(Number.isFinite)).toBe(true);
  });

  it("recomputes weapon scale when the animated hand span changes", () => {
    const character = createCharacter();
    const weapon = createWeapon();
    const first = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    const rightHand = character.getObjectByName("mixamorig:RightHand")!;
    rightHand.position.x += 0.4;
    character.updateMatrixWorld(true);
    const second = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(second.weaponScale).toBeGreaterThan(first.weaponScale * 1.3);
    expect(second.weaponScale).toBeCloseTo(Math.sqrt(0.4 ** 2 + 0.4 ** 2), 5);
  });

  it("rejects a candidate muzzle that does not follow the signed grip axis", () => {
    const character = createCharacter();
    const weapon = new THREE.Group();
    const support = new THREE.Object3D();
    support.name = "GripSupport";
    const primary = new THREE.Object3D();
    primary.name = "GripPrimary";
    primary.position.y = 1;
    const muzzle = new THREE.Object3D();
    muzzle.name = "tag_muzzle";
    muzzle.position.set(1, -1, 0);
    weapon.add(support, primary, muzzle);
    weapon.add(new THREE.Mesh(
      new THREE.BoxGeometry(3, 2, 0.2),
      new THREE.MeshBasicMaterial(),
    ));

    const result = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(result.muzzleDirectionError).toBeGreaterThan(0.35);
    expect(result.verified).toBe(false);
  });

  it("rejects an authored muzzle anchor that does not follow the grip axis", () => {
    const character = createCharacter();
    const weapon = createWeapon();
    weapon.getObjectByName("Muzzle")!.position.set(0.5, -0.1, 0);

    const result = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(result.solved).toBe(false);
    expect(result.reason).toBe("invalid authored muzzle axis");
    expect(result.socketSources.muzzle).toBe("authored");
    expect(result.socketNodes.muzzle).toBe("Muzzle");
    expect(result.weaponScale).toBe(0);
  });

  it("rejects a pose with an implausibly straight elbow", () => {
    const character = createCharacter();
    const leftElbow = character.getObjectByName("mixamorig:LeftForeArm")!;
    const leftHand = character.getObjectByName("mixamorig:LeftHand")!;
    leftElbow.position.set(0, 0.4, 0.4);
    leftHand.position.set(0, -0.8, -0.8);
    character.updateMatrixWorld(true);

    const weapon = createWeapon();
    weapon.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) child.visible = false;
    });
    const result = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(result.elbowBendError).toBeGreaterThan(0);
    expect(result.verified).toBe(false);
  });

  it("rejects a pose when the weapon body penetrates the character proxy", () => {
    const character = createCharacter();
    const weapon = createWeapon();
    weapon.add(new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshBasicMaterial(),
    ));

    const result = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(result.clipping.checked).toBe(true);
    expect(result.clipping.weaponBody || result.clipping.weaponArm).toBe(true);
    expect(result.verified).toBe(false);
  });

  it("allows a named magazine to contact the torso without allowing oversized weapon geometry", () => {
    const character = createCharacter();
    const weapon = createWeapon(false);
    const magazine = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.8, 0.3),
      new THREE.MeshBasicMaterial(),
    );
    magazine.name = "Magazine";
    magazine.position.y = 1;
    weapon.add(magazine);

    const magazineResult = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(magazineResult.clipping.weaponBody).toBe(false);

    const oversizedWeapon = createWeapon(false);
    oversizedWeapon.add(new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshBasicMaterial(),
    ));
    const oversizedResult = solveVerifiedGripPose(character, oversizedWeapon, { weaponId: "rifle" });

    expect(oversizedResult.clipping.weaponBody).toBe(true);
    expect(oversizedResult.verified).toBe(false);
  });

  it("fails closed when required character proxy segments are missing", () => {
    const result = solveVerifiedGripPose(createCharacter(false), createWeapon(), { weaponId: "rifle" });

    expect(result.solved).toBe(true);
    expect(result.clipping.checked).toBe(true);
    expect(result.verified).toBe(false);
    expect(result.reason).toContain("proxy");
  });

  it("resolves arm top/bot aliases for a complete third-person proxy", () => {
    const result = solveVerifiedGripPose(createArmAliasCharacter(), createWeapon(), { weaponId: "rifle" });

    expect(result.solved).toBe(true);
    expect(result.clipping.proxyComplete).toBe(true);
    expect(result.verified).toBe(true);
  });

  it("refreshes cached anchors after a socket transform changes", () => {
    const character = createCharacter();
    const weapon = createWeapon();
    const first = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    weapon.getObjectByName("GripPrimary")!.position.y = 1.4;
    weapon.updateMatrixWorld(true);
    const second = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(second.weaponScale).toBeCloseTo(first.weaponScale / 1.4, 5);
  });

  it("refreshes procedural anchors after weapon geometry changes", () => {
    const character = createCharacter();
    const weapon = createProceduralWeapon();
    const first = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    weapon.children[0].scale.y = 2;
    weapon.updateMatrixWorld(true);
    const second = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(second.weaponScale).toBeCloseTo(first.weaponScale / 2, 5);
  });

  it("refreshes procedural anchors when an authored socket is added", () => {
    const character = createCharacter();
    const weapon = createProceduralWeapon();
    const first = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });
    expect(first.socketSources.primary).toBe("procedural");

    const primary = new THREE.Object3D();
    primary.name = "GripPrimary";
    primary.position.set(0.1, 0, 0);
    weapon.add(primary);
    weapon.updateMatrixWorld(true);

    const second = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(second.socketSources.primary).toBe("authored");
    expect(second.socketNodes.primary).toBe("GripPrimary");

    primary.name = "GripPrimaryRenamed";
    weapon.updateMatrixWorld(true);
    const third = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(third.socketSources.primary).toBe("candidate");
    expect(third.socketNodes.primary).toBe("GripPrimaryRenamed");
  });

  it("retains stability tracking for procedural anchors", () => {
    const character = createCharacter();
    const weapon = createProceduralWeapon();
    const first = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });
    expect(first.stable).toBe(true);

    character.getObjectByName("mixamorig:RightHand")!.position.x += 1;
    character.updateMatrixWorld(true);
    const second = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(second.stable).toBe(false);
  });

  it("invalidates cached clipping geometry when a mesh is added", () => {
    const character = createCharacter();
    const weapon = createWeapon();
    weapon.getObjectByName("ADSReference")!.position.z = 0;
    weapon.updateMatrixWorld(true);
    const first = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });
    expect(first.clipping.weaponBody || first.clipping.weaponArm).toBe(false);

    const oversized = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshBasicMaterial(),
    );
    weapon.add(oversized);
    weapon.updateMatrixWorld(true);
    const result = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(result.clipping.weaponBody || result.clipping.weaponArm).toBe(true);
    expect(result.verified).toBe(false);
  });

  it("refreshes cached anchors when an authored socket is renamed", () => {
    const character = createCharacter();
    const weapon = createWeapon();
    solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    weapon.getObjectByName("GripPrimary")!.name = "RenamedGrip";
    weapon.updateMatrixWorld(true);
    const result = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

    expect(result.socketNodes.primary).toBe("RenamedGrip");
    expect(result.socketSources.primary).toBe("candidate");
  });

  it("refreshes cached anchors when the metadata socket contract changes", () => {
    const character = createCharacter();
    const weapon = createWeapon();
    solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });
    const nodes = WEAPON_ASSET_DETAILS.rifle.animation!.nodes;
    const previousName = nodes.gripPrimary;
    const metadataSocket = new THREE.Object3D();
    metadataSocket.name = "MetadataGrip";
    metadataSocket.position.y = 1;
    weapon.add(metadataSocket);

    try {
      nodes.gripPrimary = metadataSocket.name;
      weapon.updateMatrixWorld(true);
      const result = solveVerifiedGripPose(character, weapon, { weaponId: "rifle" });

      expect(result.socketNodes.primary).toBe("MetadataGrip");
      expect(result.socketSources.primary).toBe("authored");
    } finally {
      nodes.gripPrimary = previousName;
      weapon.remove(metadataSocket);
    }
  });

  it("keeps fallback weapons visible when there is no player model to pose", () => {
    expect(shouldShowRemotePlayerWeapon(false, false)).toBe(true);
    expect(shouldShowRemotePlayerWeapon(true, false)).toBe(false);
    expect(shouldShowRemotePlayerWeapon(true, true)).toBe(true);
  });

  it("replaces a late fallback weapon only when its exact catalog template is ready", () => {
    const fallback = new THREE.Group();
    fallback.name = "RemoteWeapon_Fallback_smg";

    expect(shouldReplaceRemotePlayerWeapon(fallback, "smg", "smg", false)).toBe(false);
    expect(shouldReplaceRemotePlayerWeapon(fallback, "smg", "smg", true)).toBe(true);
    expect(shouldReplaceRemotePlayerWeapon(fallback, "rifle", "smg", false)).toBe(true);
    expect(shouldReplaceRemotePlayerWeapon(undefined, undefined, "smg", false)).toBe(true);
  });

  it("disposes owned remote resources once without touching shared descendants", () => {
    const root = new THREE.Group();
    const ownedGeometry = new THREE.BoxGeometry(1, 1, 1);
    const ownedMaterial = new THREE.MeshBasicMaterial();
    const ownedA = new THREE.Mesh(ownedGeometry, ownedMaterial);
    const ownedB = new THREE.Mesh(ownedGeometry, ownedMaterial);
    ownedA.userData.remoteOwned = true;
    ownedB.userData.remoteOwned = true;
    root.add(ownedA, ownedB);

    const sharedGeometry = new THREE.BoxGeometry(1, 1, 1);
    const sharedMaterial = new THREE.MeshBasicMaterial();
    root.add(new THREE.Mesh(sharedGeometry, sharedMaterial));

    const ownedGeometryDispose = vi.spyOn(ownedGeometry, "dispose");
    const ownedMaterialDispose = vi.spyOn(ownedMaterial, "dispose");
    const sharedGeometryDispose = vi.spyOn(sharedGeometry, "dispose");
    const sharedMaterialDispose = vi.spyOn(sharedMaterial, "dispose");

    disposeOwnedRemoteResources(root);

    expect(ownedGeometryDispose).toHaveBeenCalledOnce();
    expect(ownedMaterialDispose).toHaveBeenCalledOnce();
    expect(sharedGeometryDispose).not.toHaveBeenCalled();
    expect(sharedMaterialDispose).not.toHaveBeenCalled();
  });

  it("disposes owned resources through the PLAYER_LEFT network path", () => {
    const scene = new THREE.Scene();
    const mesh = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    const first = new THREE.Mesh(geometry, material);
    const second = new THREE.Mesh(geometry, material);
    first.userData.remoteOwned = true;
    second.userData.remoteOwned = true;
    mesh.add(first, second);
    scene.add(mesh);

    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const mixer = { stopAllAction: vi.fn() };
    const match = {
      scene,
      remotePlayersMeshes: new Map([["player-1", mesh]]),
      remotePlayerMixers: new Map([["player-1", mixer]]),
      remotePlayersTargetData: new Map([["player-1", { pos: new THREE.Vector3() }]]),
    };
    const networkSync = Object.create(NetworkSyncSystem.prototype) as NetworkSyncSystem;
    (networkSync as any).match = match;

    (networkSync as any).handleReliableEvent({ type: "PLAYER_LEFT", playerId: "player-1" });

    expect(scene.getObjectById(mesh.id)).toBeUndefined();
    expect(match.remotePlayersMeshes.has("player-1")).toBe(false);
    expect(match.remotePlayerMixers.has("player-1")).toBe(false);
    expect(match.remotePlayersTargetData.has("player-1")).toBe(false);
    expect(mixer.stopAllAction).toHaveBeenCalledOnce();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
  });

  it("treats the secondary weapon alias as the pistol contract", () => {
    const pistol = solveVerifiedGripPose(createCharacter(), createWeapon(), { weaponId: "pistol" });
    const secondary = solveVerifiedGripPose(createCharacter(), createWeapon(), { weaponId: "secondary" });

    expect(secondary.solved).toBe(pistol.solved);
    expect(secondary.socketSources).toEqual(pistol.socketSources);
    expect(secondary.muzzleDirectionError).toBeCloseTo(pistol.muzzleDirectionError, 8);
  });

  it("produces the same pose for an independently cloned character and weapon", () => {
    const characterA = createCharacter();
    const weaponA = createWeapon();
    const resultA = solveVerifiedGripPose(characterA, weaponA, { weaponId: "rifle" });

    const characterB = characterA.clone(true) as THREE.Group;
    const weaponB = createWeapon();
    const resultB = solveVerifiedGripPose(characterB, weaponB, { weaponId: "rifle" });

    expect(resultB.solved).toBe(true);
    expect(weaponB.position.distanceTo(weaponA.position)).toBeLessThan(0.0001);
    expect(weaponB.quaternion.angleTo(weaponA.quaternion)).toBeLessThan(0.0001);
    expect(resultB.primaryGripError).toBeCloseTo(resultA.primaryGripError, 8);
  });

  it("evaluates candidates from the same baseline transform regardless of order", () => {
    const characterA = createCharacter();
    const weaponA = createWeapon();
    const forward = chooseVerifiedGripPose(characterA, weaponA);

    const characterB = createCharacter();
    const weaponB = createWeapon();
    const reverse = chooseVerifiedGripPose(
      characterB,
      weaponB,
      [...forward.candidates.map(({ candidate }) => candidate)].reverse(),
    );

    const forwardScores = new Map(forward.candidates.map(({ candidate, diagnostics }) => [candidate.id, diagnostics.score]));
    const reverseScores = new Map(reverse.candidates.map(({ candidate, diagnostics }) => [candidate.id, diagnostics.score]));
    expect(reverse.selected.id).toBe(forward.selected.id);
    for (const [id, score] of forwardScores) expect(reverseScores.get(id)).toBeCloseTo(score, 8);
  });
});
