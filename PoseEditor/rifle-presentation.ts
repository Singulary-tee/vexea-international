import * as THREE from "three/webgpu";
import { resolveGripAnchors } from "../client/weapons/pose-solver";
import {
  alignPoseFrame,
  measureMeshLongitudinalAxis,
  measureProbedBarrelAxis,
  resolveBarrelDirection,
  type BarrelDirectionMeasurement,
  type BarrelGeometryProbe,
  type BarrelMeasurement,
} from "./pose-editor-geometry";

type HandSide = "Left" | "Right";
type FingerName = "index" | "thumb";
type Vec3Tuple = [number, number, number];
type QuaternionTuple = [number, number, number, number];

interface ArmChain {
  shoulder: THREE.Object3D;
  elbow: THREE.Object3D;
  hand: THREE.Object3D;
  side: -1 | 1;
}

interface FingerChain {
  root: THREE.Object3D;
  joints: THREE.Object3D[];
}

interface HandParts {
  arm: ArmChain;
  index: FingerChain;
  thumb: FingerChain;
}

export interface RiflePresentationOptions {
  weaponId?: string;
  clipName?: string;
  view?: "first" | "third";
  wristTwist?: number;
  fingerCurl?: number;
  fingerCurlAxis?: "x" | "z";
}

export interface RifleContactJointDiagnostic {
  name: string;
  index: number;
  worldPosition: Vec3Tuple;
  radialError: number;
  longitudinalProjection: number;
  distanceToGrip: number;
}

export interface RifleContactChainDiagnostic {
  finger: FingerName;
  gripPoint: Vec3Tuple;
  weaponForward: Vec3Tuple;
  joints: RifleContactJointDiagnostic[];
  longitudinalProjections: number[];
  terminalEndpointDistance: number;
  terminalRadialError: number;
  monotonic: boolean;
  monotonicDirection: "increasing" | "decreasing" | "constant" | "invalid";
  valid: boolean;
}

export interface RifleHandContactDiagnostic {
  side: Lowercase<HandSide>;
  index: RifleContactChainDiagnostic;
  thumb: RifleContactChainDiagnostic;
  indexThumbOrdering: number[];
  indexThumbOrderingIndices: number[];
  indexThumbOrderingValid: boolean;
  indexThumbCrossing: boolean;
  valid: boolean;
}

export interface RifleContactDiagnostics {
  weaponForward: Vec3Tuple;
  lateralAxis: Vec3Tuple;
  left: RifleHandContactDiagnostic;
  right: RifleHandContactDiagnostic;
  valid: boolean;
}

export interface RifleContactDiagnosticsComparison {
  preRotation: RifleContactDiagnostics;
  postRotation: RifleContactDiagnostics | null;
  orderingPreserved: boolean;
  contactWithinTolerance: boolean;
  radialErrorsWithinTolerance: boolean;
  maxRadialErrorIncrease: number;
  valid: boolean;
  reason: string;
}

export interface RiflePresentationResult {
  applied: boolean;
  reason: string;
  rollbackReason: string | null;
  view: "first" | "third";
  handSpan: number;
  primaryGripError: number;
  supportGripError: number;
  handFrameApplied: boolean;
  handFrameError: number;
  wristTwist: number;
  fingerCurl: number;
  fingerCurlAxis: "x" | "z";
  diagnostics: RifleContactDiagnosticsComparison | null;
}

export interface LiveRifleFrameMeasurement {
  weapon: THREE.Object3D;
  view: "first" | "third";
  phase: "pre-presentation" | "post-presentation" | "post-bake";
  barrel: Omit<BarrelDirectionMeasurement, "source"> & {
    probes: BarrelGeometryProbe[];
    source: "live-mesh" | "baked-mesh";
  };
  adsY: {
    direction: THREE.Vector3;
    node: THREE.Object3D;
    source: "authored";
  };
  barrelMeasurement: BarrelMeasurement;
}

interface RifleFrameDiagnostics {
  forward: Vec3Tuple;
  up: Vec3Tuple;
  right: Vec3Tuple;
  determinant: number;
}

export interface RifleWeaponPresentationResult {
  applied: boolean;
  reason: string;
  rollbackReason: string | null;
  view: "first" | "third";
  handSpan: number;
  translation: Vec3Tuple;
  deltaQuaternion: QuaternionTuple | null;
  sourceFrame: RifleFrameDiagnostics | null;
  targetFrame: RifleFrameDiagnostics | null;
  preBarrelDirection: Vec3Tuple | null;
  postBarrelDirection: Vec3Tuple | null;
  preAdsY: Vec3Tuple | null;
  postAdsY: Vec3Tuple | null;
  worldPositionBefore: Vec3Tuple | null;
  worldPositionAfter: Vec3Tuple | null;
  worldQuaternionBefore: QuaternionTuple | null;
  worldQuaternionAfter: QuaternionTuple | null;
  worldScaleBefore: Vec3Tuple | null;
  worldScaleAfter: Vec3Tuple | null;
  worldMatrixBefore: number[] | null;
  worldMatrixAfter: number[] | null;
  primaryGripError: number;
  supportGripError: number;
  muzzleDirectionError: number;
}

const MAX_HAND_FRAME_DETERMINANT_ERROR = 1e-4;
const MAX_GRIP_ERROR = 0.035;
const MAX_FINGER_RADIAL_ERROR = 0.08;
const MAX_TERMINAL_ENDPOINT_DISTANCE = 0.16;
const TRANSFORM_TOLERANCE = 1e-8;
const MATRIX_TOLERANCE = 1e-6;
const VECTOR_EPSILON_SQ = 1e-10;
const ORDERING_EPSILON = 1e-7;
const RADIAL_ERROR_TOLERANCE = 1e-6;
const FRAME_DETERMINANT_TOLERANCE = 1e-4;
const FRAME_ALIGNMENT_TOLERANCE = 1e-3;

const RIFLE_AUTHORED_NODE_NAMES: Record<"primary" | "support" | "muzzle" | "ads", string> = {
  primary: "tagtrigger0223",
  support: "combatgrip0233",
  muzzle: "tagmuzzle0222",
  ads: "exps3socket0225",
};

function normalizedName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function finiteVector(vector: THREE.Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function finiteQuaternion(quaternion: THREE.Quaternion): boolean {
  const lengthSq = quaternion.lengthSq();
  return Number.isFinite(quaternion.x)
    && Number.isFinite(quaternion.y)
    && Number.isFinite(quaternion.z)
    && Number.isFinite(quaternion.w)
    && Number.isFinite(lengthSq)
    && lengthSq > VECTOR_EPSILON_SQ;
}

function tuple(vector: THREE.Vector3): Vec3Tuple {
  return [vector.x, vector.y, vector.z];
}

function quaternionTuple(quaternion: THREE.Quaternion): QuaternionTuple {
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

function finiteMatrix(matrix: THREE.Matrix4): boolean {
  return matrix.elements.every(Number.isFinite);
}

function sameMatrix(left: THREE.Matrix4, right: THREE.Matrix4, tolerance = MATRIX_TOLERANCE): boolean {
  return left.elements.every((value, index) => Math.abs(value - right.elements[index]) <= tolerance);
}

function uniformScale(scale: THREE.Vector3): boolean {
  return finiteVector(scale)
    && scale.x > VECTOR_EPSILON_SQ
    && Math.abs(scale.x - scale.y) <= MATRIX_TOLERANCE
    && Math.abs(scale.x - scale.z) <= MATRIX_TOLERANCE;
}

function isDescendant(root: THREE.Object3D, object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current === root) return true;
    current = current.parent;
  }
  return false;
}

function normalizedFrame(
  forward: THREE.Vector3,
  up: THREE.Vector3,
): { forward: THREE.Vector3; up: THREE.Vector3; right: THREE.Vector3; determinant: number } | null {
  const normalizedForward = forward.clone();
  if (!finiteVector(normalizedForward) || normalizedForward.lengthSq() < VECTOR_EPSILON_SQ) return null;
  normalizedForward.normalize();
  const normalizedUp = up.clone().addScaledVector(normalizedForward, -up.dot(normalizedForward));
  if (!finiteVector(normalizedUp) || normalizedUp.lengthSq() < VECTOR_EPSILON_SQ) return null;
  normalizedUp.normalize();
  const right = normalizedUp.clone().cross(normalizedForward);
  if (!finiteVector(right) || right.lengthSq() < VECTOR_EPSILON_SQ) return null;
  right.normalize();
  const determinant = right.clone().cross(normalizedUp).dot(normalizedForward);
  if (!Number.isFinite(determinant) || Math.abs(determinant - 1) > FRAME_DETERMINANT_TOLERANCE) return null;
  return { forward: normalizedForward, up: normalizedUp, right, determinant };
}

function frameDiagnostics(frame: NonNullable<ReturnType<typeof normalizedFrame>>): RifleFrameDiagnostics {
  return {
    forward: tuple(frame.forward),
    up: tuple(frame.up),
    right: tuple(frame.right),
    determinant: frame.determinant,
  };
}

const RIFLE_LIVE_NODE_ALIASES: Record<"primary" | "support" | "muzzle" | "ads", string[]> = {
  primary: [RIFLE_AUTHORED_NODE_NAMES.primary, "GripPrimary"],
  support: [RIFLE_AUTHORED_NODE_NAMES.support, "GripSupport"],
  muzzle: [RIFLE_AUTHORED_NODE_NAMES.muzzle, "Muzzle"],
  ads: [RIFLE_AUTHORED_NODE_NAMES.ads, "ADSReference", "EXPS3_Socket"],
};

function findUniqueRifleNode(
  weapon: THREE.Object3D,
  socket: keyof typeof RIFLE_LIVE_NODE_ALIASES,
): THREE.Object3D | null {
  const wanted = new Set(RIFLE_LIVE_NODE_ALIASES[socket].map(normalizedName));
  const matches: THREE.Object3D[] = [];
  weapon.traverse((child) => {
    if (wanted.has(normalizedName(child.name))) matches.push(child);
  });
  return matches.length === 1 ? matches[0] : null;
}

function findNamed(root: THREE.Object3D, names: readonly string[]): THREE.Object3D | null {
  const wanted = new Set(names.map(normalizedName));
  const matches: THREE.Object3D[] = [];
  root.traverse((child) => {
    if (wanted.has(normalizedName(child.name)) && !matches.includes(child)) matches.push(child);
  });
  return matches.length === 1 ? matches[0] : null;
}

function findDirectNamed(parent: THREE.Object3D, names: readonly string[]): THREE.Object3D | null {
  const wanted = new Set(names.map(normalizedName));
  const matches = parent.children.filter((child) => wanted.has(normalizedName(child.name)));
  return matches.length === 1 ? matches[0] : null;
}

function findArm(character: THREE.Object3D, side: HandSide): ArmChain | null {
  const lowerSide = side.toLowerCase();
  const shoulder = findNamed(character, [
    `mixamorig:${side}Arm`,
    `mixamorig${side}Arm`,
    `${side}Arm`,
    `arm_${lowerSide}_top`,
  ]);
  const elbow = findNamed(character, [
    `mixamorig:${side}ForeArm`,
    `mixamorig${side}ForeArm`,
    `${side}ForeArm`,
    `arm_${lowerSide}_bot`,
    `arm_${lowerSide}_fore_arm`,
  ]);
  const hand = findNamed(character, [
    `mixamorig:${side}Hand`,
    `mixamorig${side}Hand`,
    `${side}Hand`,
    `arm_${lowerSide}_hand`,
  ]);
  if (!shoulder || !elbow || !hand || elbow.parent !== shoulder || hand.parent !== elbow) return null;
  return { shoulder, elbow, hand, side: side === "Left" ? -1 : 1 };
}

function fingerNames(
  side: HandSide,
  finger: "Index" | "Thumb",
  index: number,
): string[] {
  return [
    `mixamorig:${side}Hand${finger}${index}`,
    `mixamorig${side}Hand${finger}${index}`,
    `${side}Hand${finger}${index}`,
  ];
}

function findFingerChain(hand: THREE.Object3D, side: HandSide, finger: "Index" | "Thumb"): FingerChain | null {
  const root = findDirectNamed(hand, fingerNames(side, finger, 1));
  if (!root) return null;
  const joints = [root];
  let parent = root;
  for (let index = 2; index <= 4; index += 1) {
    const next = findDirectNamed(parent, fingerNames(side, finger, index));
    if (!next) return null;
    joints.push(next);
    parent = next;
  }
  return { root, joints };
}

function findHandParts(character: THREE.Object3D): { left: HandParts; right: HandParts } | null {
  const leftArm = findArm(character, "Left");
  const rightArm = findArm(character, "Right");
  if (!leftArm || !rightArm) return null;
  const leftIndex = findFingerChain(leftArm.hand, "Left", "Index");
  const leftThumb = findFingerChain(leftArm.hand, "Left", "Thumb");
  const rightIndex = findFingerChain(rightArm.hand, "Right", "Index");
  const rightThumb = findFingerChain(rightArm.hand, "Right", "Thumb");
  if (!leftIndex || !leftThumb || !rightIndex || !rightThumb) return null;
  return {
    left: { arm: leftArm, index: leftIndex, thumb: leftThumb },
    right: { arm: rightArm, index: rightIndex, thumb: rightThumb },
  };
}

function worldGripPoint(anchor: THREE.Vector3, weapon: THREE.Object3D): THREE.Vector3 {
  return anchor.clone().applyMatrix4(weapon.matrixWorld);
}

function localQuaternionForWorld(object: THREE.Object3D, worldQuaternion: THREE.Quaternion): THREE.Quaternion {
  const parentQuaternion = object.parent?.getWorldQuaternion(new THREE.Quaternion()) || new THREE.Quaternion();
  return parentQuaternion
    .normalize()
    .invert()
    .multiply(worldQuaternion)
    .normalize();
}

function targetHandFrame(
  handAxis: THREE.Vector3,
  desiredPalmNormal: THREE.Vector3,
): { forward: THREE.Vector3; lateral: THREE.Vector3; up: THREE.Vector3; quaternion: THREE.Quaternion } | null {
  const forward = handAxis.clone();
  if (!finiteVector(forward) || forward.lengthSq() < VECTOR_EPSILON_SQ) return null;
  forward.normalize();
  const up = desiredPalmNormal.clone().addScaledVector(forward, -forward.dot(desiredPalmNormal));
  if (!finiteVector(up) || up.lengthSq() < VECTOR_EPSILON_SQ) return null;
  up.normalize();
  const lateral = forward.clone().cross(up);
  if (!finiteVector(lateral) || lateral.lengthSq() < VECTOR_EPSILON_SQ) return null;
  lateral.normalize();
  const determinant = lateral.clone().cross(forward).dot(up);
  if (!Number.isFinite(determinant) || Math.abs(determinant - 1) > MAX_HAND_FRAME_DETERMINANT_ERROR) {
    return null;
  }
  const quaternion = new THREE.Quaternion()
    .setFromRotationMatrix(new THREE.Matrix4().makeBasis(lateral, forward, up))
    .normalize();
  if (!finiteQuaternion(quaternion)) return null;
  return { forward, lateral, up, quaternion };
}

interface HandFramePlan {
  hand: THREE.Object3D;
  localQuaternion: THREE.Quaternion;
  frameError: number;
}

function handFramePlan(
  hand: THREE.Object3D,
  index: THREE.Object3D,
  thumb: THREE.Object3D,
  target: { forward: THREE.Vector3; quaternion: THREE.Quaternion },
  wristTwist: THREE.Quaternion,
): HandFramePlan | { reason: string } {
  const origin = hand.getWorldPosition(new THREE.Vector3());
  const measuredIndex = index.getWorldPosition(new THREE.Vector3()).sub(origin);
  const measuredThumb = thumb.getWorldPosition(new THREE.Vector3()).sub(origin);
  if (!finiteVector(origin)
    || !finiteVector(measuredIndex)
    || !finiteVector(measuredThumb)
    || measuredIndex.lengthSq() < VECTOR_EPSILON_SQ
    || measuredThumb.lengthSq() < VECTOR_EPSILON_SQ) {
    return { reason: "rifle hand-frame measurement is degenerate" };
  }

  const measuredY = measuredIndex.normalize();
  const thumbDirection = measuredThumb.normalize();
  const measuredZ = measuredY.clone().cross(thumbDirection);
  if (!finiteVector(measuredZ) || measuredZ.lengthSq() < VECTOR_EPSILON_SQ) {
    return { reason: "rifle hand-frame palm normal is degenerate" };
  }
  measuredZ.normalize();
  const measuredX = measuredY.clone().cross(measuredZ);
  if (!finiteVector(measuredX) || measuredX.lengthSq() < VECTOR_EPSILON_SQ) {
    return { reason: "rifle hand-frame lateral axis is degenerate" };
  }
  measuredX.normalize();
  const determinant = measuredX.clone().cross(measuredY).dot(measuredZ);
  if (!Number.isFinite(determinant) || Math.abs(determinant - 1) > MAX_HAND_FRAME_DETERMINANT_ERROR) {
    return { reason: "rifle hand-frame measurement is not proper-handed" };
  }
  const measuredQuaternion = new THREE.Quaternion()
    .setFromRotationMatrix(new THREE.Matrix4().makeBasis(measuredX, measuredY, measuredZ))
    .normalize();
  if (!finiteQuaternion(measuredQuaternion)) return { reason: "rifle measured hand-frame quaternion is invalid" };
  const frameCorrection = target.quaternion
    .clone()
    .multiply(measuredQuaternion.clone().invert())
    .normalize();
  const currentWorldQuaternion = hand.getWorldQuaternion(new THREE.Quaternion()).normalize();
  const desiredWorldQuaternion = wristTwist
    .clone()
    .multiply(frameCorrection)
    .multiply(currentWorldQuaternion)
    .normalize();
  if (!finiteQuaternion(frameCorrection)
    || !finiteQuaternion(currentWorldQuaternion)
    || !finiteQuaternion(desiredWorldQuaternion)) {
    return { reason: "rifle hand-frame quaternion is invalid" };
  }
  const localQuaternion = localQuaternionForWorld(hand, desiredWorldQuaternion);
  if (!finiteQuaternion(localQuaternion)) return { reason: "rifle local hand quaternion is invalid" };
  const frameError = measuredQuaternion.angleTo(target.quaternion);
  if (!Number.isFinite(frameError)) return { reason: "rifle hand-frame angle is invalid" };
  return { hand, localQuaternion, frameError };
}

interface TransformSnapshot {
  object: THREE.Object3D;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  localMatrix: THREE.Matrix4;
  worldPosition: THREE.Vector3;
  worldQuaternion: THREE.Quaternion;
  worldScale: THREE.Vector3;
  worldMatrix: THREE.Matrix4;
}

export interface RiflePoseTransactionSnapshot {
  character: TransformSnapshot[];
  weapon: TransformSnapshot[];
  weaponParent: THREE.Object3D | null;
}

function snapshotTransform(object: THREE.Object3D): TransformSnapshot {
  if (object.matrixAutoUpdate) object.updateMatrix();
  return {
    object,
    position: object.position.clone(),
    quaternion: object.quaternion.clone(),
    scale: object.scale.clone(),
    localMatrix: object.matrix.clone(),
    worldPosition: object.getWorldPosition(new THREE.Vector3()),
    worldQuaternion: object.getWorldQuaternion(new THREE.Quaternion()),
    worldScale: object.getWorldScale(new THREE.Vector3()),
    worldMatrix: object.matrixWorld.clone(),
  };
}

function snapshotTree(root: THREE.Object3D): TransformSnapshot[] {
  const snapshots: TransformSnapshot[] = [];
  root.traverse((object) => snapshots.push(snapshotTransform(object)));
  return snapshots;
}

function restoreTransform(snapshot: TransformSnapshot): void {
  snapshot.object.position.copy(snapshot.position);
  snapshot.object.quaternion.copy(snapshot.quaternion);
  snapshot.object.scale.copy(snapshot.scale);
  snapshot.object.matrix.copy(snapshot.localMatrix);
  snapshot.object.matrixWorldNeedsUpdate = true;
}

function restoreTree(snapshots: TransformSnapshot[]): void {
  for (const snapshot of snapshots) restoreTransform(snapshot);
}

export function snapshotRiflePoseTransaction(
  character: THREE.Object3D,
  weapon: THREE.Object3D,
): RiflePoseTransactionSnapshot {
  character.updateMatrixWorld(true);
  weapon.updateMatrixWorld(true);
  return {
    character: snapshotTree(character),
    weapon: snapshotTree(weapon),
    weaponParent: weapon.parent,
  };
}

export function restoreRiflePoseTransaction(
  snapshot: RiflePoseTransactionSnapshot,
  character: THREE.Object3D,
  weapon: THREE.Object3D,
): void {
  if (weapon.parent !== snapshot.weaponParent) {
    if (snapshot.weaponParent) snapshot.weaponParent.add(weapon);
    else weapon.removeFromParent();
  }
  restoreTree(snapshot.character);
  restoreTree(snapshot.weapon);
  character.updateMatrixWorld(true);
  weapon.updateMatrixWorld(true);
}

function sameVector(left: THREE.Vector3, right: THREE.Vector3): boolean {
  return left.distanceToSquared(right) <= TRANSFORM_TOLERANCE ** 2;
}

function sameQuaternion(left: THREE.Quaternion, right: THREE.Quaternion): boolean {
  const leftLength = left.length();
  const rightLength = right.length();
  if (!Number.isFinite(leftLength) || !Number.isFinite(rightLength)
    || leftLength <= VECTOR_EPSILON_SQ || rightLength <= VECTOR_EPSILON_SQ) return false;
  const dot = Math.abs(left.dot(right)) / (leftLength * rightLength);
  return Number.isFinite(dot)
    && Math.abs(leftLength - rightLength) <= TRANSFORM_TOLERANCE
    && Math.abs(1 - dot) <= TRANSFORM_TOLERANCE;
}

function sameTransform(snapshot: TransformSnapshot, includeQuaternion: boolean): boolean {
  const object = snapshot.object;
  return sameVector(object.position, snapshot.position)
    && (!includeQuaternion || sameQuaternion(object.quaternion, snapshot.quaternion))
    && sameVector(object.scale, snapshot.scale)
    && (!includeQuaternion || sameMatrix(object.matrix, snapshot.localMatrix))
    && sameVector(object.getWorldPosition(new THREE.Vector3()), snapshot.worldPosition)
    && (!includeQuaternion
      || sameQuaternion(object.getWorldQuaternion(new THREE.Quaternion()), snapshot.worldQuaternion))
    && sameVector(object.getWorldScale(new THREE.Vector3()), snapshot.worldScale);
}

function sameLocalTransform(snapshot: TransformSnapshot, includeQuaternion: boolean): boolean {
  const object = snapshot.object;
  return sameVector(object.position, snapshot.position)
    && (!includeQuaternion || sameQuaternion(object.quaternion, snapshot.quaternion))
    && sameVector(object.scale, snapshot.scale)
    && (!includeQuaternion || sameMatrix(object.matrix, snapshot.localMatrix));
}

interface ExperimentSnapshot {
  character: TransformSnapshot;
  weapon: TransformSnapshot[];
  armNodes: TransformSnapshot[];
  handTrees: TransformSnapshot[][];
  gripPoints: {
    primary: THREE.Vector3;
    support: THREE.Vector3;
    muzzle: THREE.Vector3;
    ads: THREE.Vector3;
  };
}

function takeExperimentSnapshot(
  character: THREE.Object3D,
  weapon: THREE.Object3D,
  hands: { left: HandParts; right: HandParts },
  gripPoints: ExperimentSnapshot["gripPoints"],
): ExperimentSnapshot {
  const armNodes = [
    hands.left.arm.shoulder,
    hands.left.arm.elbow,
    hands.left.arm.hand,
    hands.right.arm.shoulder,
    hands.right.arm.elbow,
    hands.right.arm.hand,
  ].map(snapshotTransform);
  return {
    character: snapshotTransform(character),
    weapon: snapshotTree(weapon),
    armNodes,
    handTrees: [snapshotTree(hands.left.arm.hand), snapshotTree(hands.right.arm.hand)],
    gripPoints: {
      primary: gripPoints.primary.clone(),
      support: gripPoints.support.clone(),
      muzzle: gripPoints.muzzle.clone(),
      ads: gripPoints.ads.clone(),
    },
  };
}

function immutableTransformViolation(
  snapshot: ExperimentSnapshot,
  hands: { left: HandParts; right: HandParts },
  weapon: THREE.Object3D,
  currentGripPoints: ExperimentSnapshot["gripPoints"],
): string | null {
  if (!sameTransform(snapshot.character, true)) return "character transform changed";
  for (const entry of snapshot.armNodes) {
    const handRoot = entry.object === hands.left.arm.hand || entry.object === hands.right.arm.hand;
    if (!sameTransform(entry, !handRoot)) {
      return `${entry.object.name || "arm node"} transform changed`;
    }
  }
  const currentWeapon = snapshotTree(weapon);
  if (currentWeapon.length !== snapshot.weapon.length) return "rifle hierarchy changed";
  for (let index = 0; index < snapshot.weapon.length; index += 1) {
    if (currentWeapon[index].object !== snapshot.weapon[index].object
      || !sameTransform(snapshot.weapon[index], true)) {
      return `${snapshot.weapon[index].object.name || "rifle node"} transform changed`;
    }
  }
  if (!sameVector(currentGripPoints.primary, snapshot.gripPoints.primary)
    || !sameVector(currentGripPoints.support, snapshot.gripPoints.support)
    || !sameVector(currentGripPoints.muzzle, snapshot.gripPoints.muzzle)
    || !sameVector(currentGripPoints.ads, snapshot.gripPoints.ads)) return "rifle grip anchor transform changed";

  const handRoots = [hands.left.arm.hand, hands.right.arm.hand];
  for (let treeIndex = 0; treeIndex < snapshot.handTrees.length; treeIndex += 1) {
    const currentTree = snapshotTree(handRoots[treeIndex]);
    const expectedTree = snapshot.handTrees[treeIndex];
    if (currentTree.length !== expectedTree.length) return "finger hierarchy changed";
    for (let nodeIndex = 0; nodeIndex < expectedTree.length; nodeIndex += 1) {
      const expected = expectedTree[nodeIndex];
      const current = currentTree[nodeIndex];
      if (current.object !== expected.object) return "finger hierarchy changed";
      const isHandRoot = current.object === handRoots[treeIndex];
      if (!sameLocalTransform(expected, !isHandRoot)) return `${current.object.name || "finger node"} transform changed`;
    }
  }
  return null;
}

function restoreExperimentSnapshot(
  snapshot: ExperimentSnapshot,
  character: THREE.Object3D,
): void {
  restoreTransform(snapshot.character);
  restoreTree(snapshot.armNodes);
  for (const tree of snapshot.handTrees) restoreTree(tree);
  restoreTree(snapshot.weapon);
  character.updateMatrixWorld(true);
}

function lineMetrics(
  position: THREE.Vector3,
  gripPoint: THREE.Vector3,
  weaponForward: THREE.Vector3,
): { radialError: number; longitudinalProjection: number; distanceToGrip: number } {
  const offset = position.clone().sub(gripPoint);
  const longitudinalProjection = offset.dot(weaponForward);
  const radialOffset = offset.addScaledVector(weaponForward, -longitudinalProjection);
  return {
    radialError: radialOffset.length(),
    longitudinalProjection,
    distanceToGrip: position.distanceTo(gripPoint),
  };
}

function contactChainDiagnostic(
  finger: FingerName,
  chain: FingerChain,
  gripPoint: THREE.Vector3,
  weaponForward: THREE.Vector3,
): RifleContactChainDiagnostic {
  const joints: RifleContactJointDiagnostic[] = [];
  for (let index = 0; index < chain.joints.length; index += 1) {
    const joint = chain.joints[index];
    const position = joint.getWorldPosition(new THREE.Vector3());
    const metrics = lineMetrics(position, gripPoint, weaponForward);
    joints.push({
      name: joint.name,
      index: index + 1,
      worldPosition: tuple(position),
      ...metrics,
    });
  }
  const longitudinalProjections = joints.map((joint) => joint.longitudinalProjection);
  let increasing = true;
  let decreasing = true;
  let segmentsValid = true;
  for (let index = 1; index < longitudinalProjections.length; index += 1) {
    const previous = longitudinalProjections[index - 1];
    const current = longitudinalProjections[index];
    if (current < previous - ORDERING_EPSILON) increasing = false;
    if (current > previous + ORDERING_EPSILON) decreasing = false;
    const previousPoint = new THREE.Vector3(...joints[index - 1].worldPosition);
    const currentPoint = new THREE.Vector3(...joints[index].worldPosition);
    if (!finiteVector(previousPoint) || !finiteVector(currentPoint)
      || currentPoint.distanceToSquared(previousPoint) < VECTOR_EPSILON_SQ) {
      segmentsValid = false;
    }
  }
  const monotonic = joints.length > 0 && (increasing || decreasing);
  const monotonicDirection = !monotonic
    ? "invalid"
    : increasing && decreasing
      ? "constant"
      : increasing
        ? "increasing"
        : "decreasing";
  const terminal = joints[joints.length - 1];
  const terminalEndpointDistance = terminal?.distanceToGrip ?? Infinity;
  const valid = joints.length > 0
    && joints.every((joint) => Number.isFinite(joint.radialError)
      && Number.isFinite(joint.longitudinalProjection)
      && Number.isFinite(joint.distanceToGrip))
    && Number.isFinite(terminalEndpointDistance)
    && segmentsValid;
  return {
    finger,
    gripPoint: tuple(gripPoint),
    weaponForward: tuple(weaponForward),
    joints,
    longitudinalProjections,
    terminalEndpointDistance,
    terminalRadialError: terminal?.radialError ?? Infinity,
    monotonic,
    monotonicDirection,
    valid,
  };
}

function handContactDiagnostic(
  side: HandSide,
  hand: HandParts,
  gripPoint: THREE.Vector3,
  weaponForward: THREE.Vector3,
  lateralAxis: THREE.Vector3,
): RifleHandContactDiagnostic {
  const index = contactChainDiagnostic("index", hand.index, gripPoint, weaponForward);
  const thumb = contactChainDiagnostic("thumb", hand.thumb, gripPoint, weaponForward);
  const indexThumbOrdering: number[] = [];
  let indexThumbCrossing = false;
  let previousSign = 0;
  const sharedJoints = Math.min(index.joints.length, thumb.joints.length);
  for (let jointIndex = 0; jointIndex < sharedJoints; jointIndex += 1) {
    const indexPoint = new THREE.Vector3(...index.joints[jointIndex].worldPosition);
    const thumbPoint = new THREE.Vector3(...thumb.joints[jointIndex].worldPosition);
    const ordering = indexPoint.clone().sub(thumbPoint).dot(lateralAxis);
    indexThumbOrdering.push(ordering);
    const sign = Math.abs(ordering) <= ORDERING_EPSILON ? 0 : Math.sign(ordering);
    if (sign !== 0 && previousSign !== 0 && sign !== previousSign) indexThumbCrossing = true;
    if (sign !== 0) previousSign = sign;
  }
  const indexThumbOrderingValid = sharedJoints > 0
    && indexThumbOrdering.every((ordering) => Math.abs(ordering) > ORDERING_EPSILON)
    && !indexThumbCrossing;
  return {
    side: side.toLowerCase() as Lowercase<HandSide>,
    index,
    thumb,
    indexThumbOrdering,
    indexThumbOrderingIndices: indexThumbOrdering.map((_, index) => index),
    indexThumbOrderingValid,
    indexThumbCrossing,
    valid: index.valid && thumb.valid && indexThumbOrderingValid,
  };
}

function contactDiagnostics(
  hands: { left: HandParts; right: HandParts },
  primary: THREE.Vector3,
  support: THREE.Vector3,
  weaponForward: THREE.Vector3,
  leftLateralAxis: THREE.Vector3,
  rightLateralAxis: THREE.Vector3,
): RifleContactDiagnostics {
  const left = handContactDiagnostic("Left", hands.left, support, weaponForward, leftLateralAxis);
  const right = handContactDiagnostic("Right", hands.right, primary, weaponForward, rightLateralAxis);
  return {
    weaponForward: tuple(weaponForward),
    lateralAxis: tuple(rightLateralAxis),
    left,
    right,
    valid: finiteVector(weaponForward)
      && finiteVector(leftLateralAxis)
      && finiteVector(rightLateralAxis)
      && left.valid
      && right.valid,
  };
}

function compareHandOrdering(
  before: RifleHandContactDiagnostic,
  after: RifleHandContactDiagnostic,
): boolean {
  if (!after.indexThumbOrderingValid
    || after.indexThumbCrossing
    || before.indexThumbOrdering.length !== after.indexThumbOrdering.length
    || before.indexThumbOrderingIndices.length !== after.indexThumbOrderingIndices.length) return false;
  if (!before.indexThumbOrderingIndices.every(
    (index, orderingIndex) => index === after.indexThumbOrderingIndices[orderingIndex],
  )) return false;
  return before.indexThumbOrdering.every((ordering, index) => (
    Math.abs(ordering) > ORDERING_EPSILON
      && Math.abs(after.indexThumbOrdering[index]) > ORDERING_EPSILON
  ));
}

function compareContactDiagnostics(
  before: RifleContactDiagnostics,
  after: RifleContactDiagnostics,
): RifleContactDiagnosticsComparison {
  const postChains: Array<RifleContactChainDiagnostic> = [
    after.left.index,
    after.left.thumb,
    after.right.index,
    after.right.thumb,
  ];
  const contactWithinTolerance = postChains.every((chain) => (
    chain.joints.every((joint) => joint.radialError <= MAX_FINGER_RADIAL_ERROR)
      && chain.terminalEndpointDistance <= MAX_TERMINAL_ENDPOINT_DISTANCE
  ));
  let maxRadialErrorIncrease = 0;
  let radialErrorsWithinTolerance = true;
  const pairedChains: Array<[
    RifleContactChainDiagnostic,
    RifleContactChainDiagnostic,
  ]> = [
    [before.left.index, after.left.index],
    [before.left.thumb, after.left.thumb],
    [before.right.index, after.right.index],
    [before.right.thumb, after.right.thumb],
  ];
  for (const [beforeChain, afterChain] of pairedChains) {
    if (beforeChain.joints.length !== afterChain.joints.length) {
      radialErrorsWithinTolerance = false;
      continue;
    }
    for (let index = 0; index < beforeChain.joints.length; index += 1) {
      const increase = afterChain.joints[index].radialError - beforeChain.joints[index].radialError;
      if (!Number.isFinite(increase)) {
        radialErrorsWithinTolerance = false;
        continue;
      }
      maxRadialErrorIncrease = Math.max(maxRadialErrorIncrease, increase);
      if (increase > RADIAL_ERROR_TOLERANCE) radialErrorsWithinTolerance = false;
    }
  }
  const orderingPreserved = compareHandOrdering(before.left, after.left)
    && compareHandOrdering(before.right, after.right);
  if (!before.valid) {
    return {
      preRotation: before,
      postRotation: after,
      orderingPreserved,
      contactWithinTolerance,
      radialErrorsWithinTolerance,
      maxRadialErrorIncrease,
      valid: false,
      reason: "pre-rotation rifle contact diagnostics are invalid",
    };
  }
  if (!after.valid) {
    return {
      preRotation: before,
      postRotation: after,
      orderingPreserved,
      contactWithinTolerance,
      radialErrorsWithinTolerance,
      maxRadialErrorIncrease,
      valid: false,
      reason: "post-rotation rifle contact diagnostics are invalid",
    };
  }
  if (!orderingPreserved) {
    return {
      preRotation: before,
      postRotation: after,
      orderingPreserved,
      contactWithinTolerance,
      radialErrorsWithinTolerance,
      maxRadialErrorIncrease,
      valid: false,
      reason: "rifle index/thumb ordering crossed during hand-root rotation",
    };
  }
  if (!contactWithinTolerance) {
    return {
      preRotation: before,
      postRotation: after,
      orderingPreserved,
      contactWithinTolerance,
      radialErrorsWithinTolerance,
      maxRadialErrorIncrease,
      valid: false,
      reason: "rifle finger contact exceeds radial or terminal tolerance",
    };
  }
  if (!radialErrorsWithinTolerance) {
    return {
      preRotation: before,
      postRotation: after,
      orderingPreserved,
      contactWithinTolerance,
      radialErrorsWithinTolerance,
      maxRadialErrorIncrease,
      valid: false,
      reason: "rifle post-rotation radial contact error increased",
    };
  }
  return {
    preRotation: before,
    postRotation: after,
    orderingPreserved,
    contactWithinTolerance,
    radialErrorsWithinTolerance,
    maxRadialErrorIncrease,
    valid: true,
    reason: "rifle post-rotation contact diagnostics valid",
  };
}

function numericOption(value: number | undefined, fallback: number, minimum: number, maximum: number): number {
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value!, minimum, maximum) : fallback;
}

interface PresentationParameters {
  view: "first" | "third";
  wristTwist: number;
  fingerCurl: number;
  fingerCurlAxis: "x" | "z";
}

function presentationParameters(options: RiflePresentationOptions): PresentationParameters {
  const view = options.view === "third" ? "third" : "first";
  return {
    view,
    wristTwist: numericOption(options.wristTwist, 0, -Math.PI / 2, Math.PI / 2),
    fingerCurl: numericOption(options.fingerCurl, 0, -Math.PI / 2, Math.PI / 2),
    fingerCurlAxis: options.fingerCurlAxis === "z" ? "z" : "x",
  };
}

function emptyResult(
  parameters: PresentationParameters,
  reason: string,
  values: Partial<Pick<
    RiflePresentationResult,
    "handSpan" | "primaryGripError" | "supportGripError" | "handFrameError" | "diagnostics"
  >> = {},
  rollbackReason: string | null = null,
): RiflePresentationResult {
  return {
    applied: false,
    reason,
    rollbackReason,
    view: parameters.view,
    handSpan: values.handSpan ?? 0,
    primaryGripError: values.primaryGripError ?? Infinity,
    supportGripError: values.supportGripError ?? Infinity,
    handFrameApplied: false,
    handFrameError: values.handFrameError ?? Infinity,
    wristTwist: parameters.wristTwist,
    fingerCurl: parameters.fingerCurl,
    fingerCurlAxis: parameters.fingerCurlAxis,
    diagnostics: values.diagnostics ?? null,
  };
}

function finiteGripPoints(points: {
  primary: THREE.Vector3;
  support: THREE.Vector3;
  muzzle: THREE.Vector3;
  ads: THREE.Vector3;
}): boolean {
  return finiteVector(points.primary)
    && finiteVector(points.support)
    && finiteVector(points.muzzle)
    && finiteVector(points.ads);
}

interface ArmLengths {
  upper: number;
  lower: number;
  minimum: number;
  maximum: number;
}

export interface RifleHoldPreparationOptions {
  weaponId?: string;
  clipName?: string;
  view?: "first" | "third";
  handSpan?: number;
}

export interface RifleHoldPreparationResult {
  applied: boolean;
  reason: string;
  handSpan: number;
  leftTarget: Vec3Tuple | null;
  rightTarget: Vec3Tuple | null;
  leftError: number;
  rightError: number;
}

const RIFLE_THIRD_HOLD_FORWARD_OFFSET = 0.30;
const RIFLE_FIRST_HOLD_FORWARD_OFFSET = 0.33;
const RIFLE_HOLD_LATERAL_OFFSET = 0.05;
const RIFLE_FIRST_HOLD_LATERAL_OFFSET = 0.05;
const RIFLE_HOLD_VERTICAL_OFFSET = 0.01;
const RIFLE_HOLD_SPAN = 0.14;
const RIFLE_FIRST_HOLD_AXIS_FORWARD = 0.999887493671163;
const RIFLE_FIRST_HOLD_AXIS_LATERAL = -0.015;
const RIFLE_THIRD_HOLD_AXIS_FORWARD = -0.47;
const RIFLE_THIRD_HOLD_AXIS_LATERAL = 0.882949843421591;
function armLengths(arm: ArmChain): ArmLengths {
  const shoulder = arm.shoulder.getWorldPosition(new THREE.Vector3());
  const elbow = arm.elbow.getWorldPosition(new THREE.Vector3());
  const hand = arm.hand.getWorldPosition(new THREE.Vector3());
  const upper = shoulder.distanceTo(elbow);
  const lower = elbow.distanceTo(hand);
  return {
    upper,
    lower,
    minimum: Math.abs(upper - lower) + 1e-4,
    maximum: Math.max(1e-4, upper + lower - 1e-4),
  };
}

function projectedBend(
  direction: THREE.Vector3,
  preferred: THREE.Vector3,
  fallback: THREE.Vector3,
): THREE.Vector3 | null {
  const bend = preferred.clone().addScaledVector(direction, -preferred.dot(direction));
  if (bend.lengthSq() < VECTOR_EPSILON_SQ) {
    bend.copy(fallback).addScaledVector(direction, -fallback.dot(direction));
  }
  if (!finiteVector(bend) || bend.lengthSq() < VECTOR_EPSILON_SQ) return null;
  return bend.normalize();
}

function setWorldQuaternion(object: THREE.Object3D, worldQuaternion: THREE.Quaternion): void {
  object.quaternion.copy(localQuaternionForWorld(object, worldQuaternion)).normalize();
}

function solveEditorArm(
  arm: ArmChain,
  requestedTarget: THREE.Vector3,
  bodyRight: THREE.Vector3,
  bodyUp: THREE.Vector3,
): number | null {
  const shoulder = arm.shoulder.getWorldPosition(new THREE.Vector3());
  const elbow = arm.elbow.getWorldPosition(new THREE.Vector3());
  const hand = arm.hand.getWorldPosition(new THREE.Vector3());
  const lengths = armLengths(arm);
  if (!finiteVector(shoulder)
    || !finiteVector(elbow)
    || !finiteVector(hand)
    || lengths.maximum <= lengths.minimum) return null;

  const direction = requestedTarget.clone().sub(shoulder);
  const distance = direction.length();
  if (!Number.isFinite(distance) || distance < VECTOR_EPSILON_SQ) return null;
  direction.multiplyScalar(1 / distance);
  const targetDistance = THREE.MathUtils.clamp(distance, lengths.minimum, lengths.maximum);
  const target = shoulder.clone().addScaledVector(direction, targetDistance);
  const bend = projectedBend(
    direction,
    bodyRight.clone().multiplyScalar(arm.side),
    bodyUp,
  );
  if (!bend) return null;

  const along = (lengths.upper ** 2 - lengths.lower ** 2 + targetDistance ** 2)
    / (2 * targetDistance);
  const height = Math.sqrt(Math.max(0, lengths.upper ** 2 - along ** 2));
  const elbowTarget = shoulder.clone()
    .addScaledVector(direction, along)
    .addScaledVector(bend, height);
  const currentUpper = elbow.sub(shoulder).normalize();
  const desiredUpper = elbowTarget.clone().sub(shoulder).normalize();
  if (!finiteVector(currentUpper) || !finiteVector(desiredUpper)) return null;

  const upperQuaternion = arm.shoulder.getWorldQuaternion(new THREE.Quaternion())
    .premultiply(new THREE.Quaternion().setFromUnitVectors(currentUpper, desiredUpper));
  setWorldQuaternion(arm.shoulder, upperQuaternion);
  arm.shoulder.updateMatrixWorld(true);

  const solvedElbow = arm.elbow.getWorldPosition(new THREE.Vector3());
  const currentLower = arm.hand.getWorldPosition(new THREE.Vector3())
    .sub(solvedElbow)
    .normalize();
  const desiredLower = target.clone().sub(solvedElbow).normalize();
  if (!finiteVector(currentLower)
    || !finiteVector(desiredLower)
    || currentLower.lengthSq() < VECTOR_EPSILON_SQ
    || desiredLower.lengthSq() < VECTOR_EPSILON_SQ) return null;
  const lowerQuaternion = arm.elbow.getWorldQuaternion(new THREE.Quaternion())
    .premultiply(new THREE.Quaternion().setFromUnitVectors(currentLower, desiredLower));
  setWorldQuaternion(arm.elbow, lowerQuaternion);
  arm.elbow.updateMatrixWorld(true);
  return arm.hand.getWorldPosition(new THREE.Vector3()).distanceTo(requestedTarget);
}

function emptyHoldPreparation(reason: string): RifleHoldPreparationResult {
  return {
    applied: false,
    reason,
    handSpan: 0,
    leftTarget: null,
    rightTarget: null,
    leftError: Infinity,
    rightError: Infinity,
  };
}

export function prepareRifleHold(
  character: THREE.Object3D,
  options: RifleHoldPreparationOptions = {},
): RifleHoldPreparationResult {
  if (options.weaponId !== "rifle" || options.clipName !== "rifle_idle") {
    return emptyHoldPreparation(
      "unsupported rifle hold state: requires weaponId=rifle and clipName=rifle_idle",
    );
  }
  const left = findArm(character, "Left");
  const right = findArm(character, "Right");
  if (!left || !right) return emptyHoldPreparation("rifle arm chains are unavailable");

  character.updateMatrixWorld(true);
  const bodyForward = new THREE.Vector3(0, 0, 1)
    .transformDirection(character.matrixWorld)
    .normalize();
  const bodyUp = new THREE.Vector3(0, 1, 0)
    .transformDirection(character.matrixWorld)
    .normalize();
  const bodyRight = bodyUp.clone().cross(bodyForward).normalize();
  const shoulderMidpoint = left.shoulder.getWorldPosition(new THREE.Vector3())
    .add(right.shoulder.getWorldPosition(new THREE.Vector3()))
    .multiplyScalar(0.5);
  const handSpan = numericOption(options.handSpan, RIFLE_HOLD_SPAN, 0.08, 0.2);
  const firstPerson = options.view !== "third";
  if (!finiteVector(bodyForward)
    || !finiteVector(bodyUp)
    || !finiteVector(bodyRight)
    || !finiteVector(shoulderMidpoint)
    || bodyForward.lengthSq() < VECTOR_EPSILON_SQ
    || bodyUp.lengthSq() < VECTOR_EPSILON_SQ
    || bodyRight.lengthSq() < VECTOR_EPSILON_SQ) {
    return emptyHoldPreparation("rifle body frame is degenerate");
  }

  const center = shoulderMidpoint
    .addScaledVector(
      bodyForward,
      firstPerson ? RIFLE_FIRST_HOLD_FORWARD_OFFSET : RIFLE_THIRD_HOLD_FORWARD_OFFSET,
    )
    .addScaledVector(
      bodyRight,
      firstPerson ? RIFLE_FIRST_HOLD_LATERAL_OFFSET : RIFLE_HOLD_LATERAL_OFFSET,
    )
    .addScaledVector(bodyUp, RIFLE_HOLD_VERTICAL_OFFSET);
  const holdAxis = bodyForward.clone().multiplyScalar(
    firstPerson ? RIFLE_FIRST_HOLD_AXIS_FORWARD : RIFLE_THIRD_HOLD_AXIS_FORWARD,
  ).addScaledVector(
    bodyRight,
    firstPerson ? RIFLE_FIRST_HOLD_AXIS_LATERAL : RIFLE_THIRD_HOLD_AXIS_LATERAL,
  )
    .normalize();
  const leftTarget = center.clone().addScaledVector(holdAxis, handSpan * 0.5);
  const rightTarget = center.clone().addScaledVector(holdAxis, -handSpan * 0.5);
  const holdSnapshot = snapshotTree(character);
  const restoreHold = (): void => {
    restoreTree(holdSnapshot);
    character.updateMatrixWorld(true);
  };
  const leftError = solveEditorArm(left, leftTarget, bodyRight, bodyUp);
  const rightError = solveEditorArm(right, rightTarget, bodyRight, bodyUp);
  character.updateMatrixWorld(true);
  const finalLeftError = left.hand.getWorldPosition(new THREE.Vector3()).distanceTo(leftTarget);
  const finalRightError = right.hand.getWorldPosition(new THREE.Vector3()).distanceTo(rightTarget);
  if (leftError === null || rightError === null) {
    restoreHold();
    return {
      applied: false,
      reason: "rifle hold target is unreachable",
      handSpan,
      leftTarget: tuple(leftTarget),
      rightTarget: tuple(rightTarget),
      leftError: finalLeftError,
      rightError: finalRightError,
    };
  }
  const applied = finalLeftError <= MAX_GRIP_ERROR && finalRightError <= MAX_GRIP_ERROR;
  if (!applied) restoreHold();
  return {
    applied,
    reason: applied ? "rifle_idle editor hold target applied" : "rifle hold target contact exceeds tolerance",
    handSpan,
    leftTarget: tuple(leftTarget),
    rightTarget: tuple(rightTarget),
    leftError: finalLeftError,
    rightError: finalRightError,
  };
}

function emptyRifleWeaponPresentationResult(
  view: "first" | "third",
  reason: string,
  values: Partial<RifleWeaponPresentationResult> = {},
): RifleWeaponPresentationResult {
  return {
    applied: false,
    reason,
    rollbackReason: null,
    view,
    handSpan: 0,
    translation: [0, 0, 0],
    deltaQuaternion: null,
    sourceFrame: null,
    targetFrame: null,
    preBarrelDirection: null,
    postBarrelDirection: null,
    preAdsY: null,
    postAdsY: null,
    worldPositionBefore: null,
    worldPositionAfter: null,
    worldQuaternionBefore: null,
    worldQuaternionAfter: null,
    worldScaleBefore: null,
    worldScaleAfter: null,
    worldMatrixBefore: null,
    worldMatrixAfter: null,
    primaryGripError: Infinity,
    supportGripError: Infinity,
    muzzleDirectionError: Infinity,
    ...values,
  };
}

export function measureLiveRifleFrame(
  weapon: THREE.Object3D,
  view: "first" | "third",
  phase: LiveRifleFrameMeasurement["phase"] = "pre-presentation",
): LiveRifleFrameMeasurement | null {
  if (!weapon.parent) return null;
  weapon.updateMatrixWorld(true);
  const nodes = {
    primary: findUniqueRifleNode(weapon, "primary"),
    support: findUniqueRifleNode(weapon, "support"),
    muzzle: findUniqueRifleNode(weapon, "muzzle"),
    ads: findUniqueRifleNode(weapon, "ads"),
  };
  if (!nodes.primary || !nodes.support || !nodes.muzzle || !nodes.ads) return null;

  const anchors = resolveGripAnchors(weapon, "rifle");
  for (const socket of ["primary", "support", "muzzle", "ads"] as const) {
    if (normalizedName(anchors[socket].nodeName || "") !== normalizedName(nodes[socket]!.name)) return null;
  }

  const muzzle = nodes.muzzle.getWorldPosition(new THREE.Vector3());
  const authored = resolveBarrelDirection(weapon, "rifle", anchors);
  const measured = measureMeshLongitudinalAxis(weapon, muzzle, authored.direction, authored.probeStart);
  if (!measured
    || measured.source !== "mesh-principal-axis"
    || !measured.probes?.length
    || !finiteVector(measured.direction)
    || measured.direction.lengthSq() < VECTOR_EPSILON_SQ) return null;
  const probes = measured.probes;
  const uniqueProbeMeshes = new Set(probes.map((probe) => probe.mesh));
  if (uniqueProbeMeshes.size !== probes.length
    || probes.some((probe) => !isDescendant(weapon, probe.mesh) || probe.indices.length < 16)) return null;
  const midpoint = measured.start.clone().add(measured.end).multiplyScalar(0.5);
  if (!finiteVector(midpoint)
    || measured.direction.clone().normalize().dot(muzzle.clone().sub(midpoint)) <= VECTOR_EPSILON_SQ) return null;

  const adsY = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(nodes.ads.getWorldQuaternion(new THREE.Quaternion()))
    .normalize();
  if (!finiteVector(adsY) || adsY.lengthSq() < VECTOR_EPSILON_SQ) return null;
  const sourceFrame = normalizedFrame(measured.direction, adsY);
  if (!sourceFrame) return null;

  const source = probes.some((probe) => Boolean((probe.mesh as any).userData?.poseEditorBakedSkin))
    ? "baked-mesh"
    : "live-mesh";
  const barrel = {
    ...measured,
    probes,
    source: source as "live-mesh" | "baked-mesh",
  };
  return {
    weapon,
    view,
    phase,
    barrel,
    adsY: { direction: adsY, node: nodes.ads, source: "authored" },
    barrelMeasurement: {
      authored,
      measurement: measured,
      actual: null,
      authoredMeshAgreement: authored.direction.angleTo(measured.direction),
    },
  };
}

export function applyRifleWeaponPresentation(
  character: THREE.Object3D,
  weapon: THREE.Object3D,
  options: RiflePresentationOptions & { frame?: LiveRifleFrameMeasurement } = {},
): RifleWeaponPresentationResult {
  const view = options.view === "third" ? "third" : "first";
  if (options.weaponId !== "rifle" || options.clipName !== "rifle_idle") {
    return emptyRifleWeaponPresentationResult(
      view,
      "unsupported rifle presentation state: requires weaponId=rifle and clipName=rifle_idle",
    );
  }
  const primaryArm = findArm(character, "Right");
  const supportArm = findArm(character, "Left");
  const frame = options.frame;
  if (!primaryArm || !supportArm || !weapon.parent) {
    return emptyRifleWeaponPresentationResult(view, "rifle presentation arm or weapon parent is unavailable");
  }
  if (!frame
    || frame.weapon !== weapon
    || frame.view !== view
    || frame.phase !== "pre-presentation"
    || frame.barrel.source !== "live-mesh"
    || frame.adsY.source !== "authored") {
    return emptyRifleWeaponPresentationResult(view, "rifle presentation requires a fresh live pre-presentation frame");
  }
  character.updateMatrixWorld(true);
  weapon.updateMatrixWorld(true);
  const primaryNode = findUniqueRifleNode(weapon, "primary");
  const supportNode = findUniqueRifleNode(weapon, "support");
  const muzzleNode = findUniqueRifleNode(weapon, "muzzle");
  const adsNode = findUniqueRifleNode(weapon, "ads");
  if (!primaryNode || !supportNode || !muzzleNode || !adsNode
    || frame.adsY.node !== adsNode
    || frame.barrel.probes.some((probe) => !isDescendant(weapon, probe.mesh))) {
    return emptyRifleWeaponPresentationResult(view, "rifle authored frame nodes or live probes are stale");
  }
  const primary = primaryNode.getWorldPosition(new THREE.Vector3());
  const support = supportNode.getWorldPosition(new THREE.Vector3());
  const muzzle = muzzleNode.getWorldPosition(new THREE.Vector3());
  const handSpan = primary.distanceTo(support);
  if (!finiteVector(primary)
    || !finiteVector(support)
    || !finiteVector(muzzle)
    || !Number.isFinite(handSpan)
    || handSpan < VECTOR_EPSILON_SQ) {
    return emptyRifleWeaponPresentationResult(view, "rifle measured primary/support span is degenerate", { handSpan });
  }
  const liveBarrel = measureProbedBarrelAxis(
    { ...frame.barrel, source: "mesh-principal-axis" },
    muzzle,
  );
  const currentAdsY = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(adsNode.getWorldQuaternion(new THREE.Quaternion()))
    .normalize();
  if (!liveBarrel
    || liveBarrel.source !== "mesh-principal-axis"
    || !finiteVector(currentAdsY)
    || !finiteVector(frame.barrel.direction)
    || !finiteVector(frame.barrel.start)
    || !finiteVector(frame.barrel.end)
    || (frame.barrel.probeStart && !finiteVector(frame.barrel.probeStart))
    || !finiteVector(frame.adsY.direction)
    || currentAdsY.angleTo(frame.adsY.direction) > FRAME_ALIGNMENT_TOLERANCE
    || liveBarrel.direction.angleTo(frame.barrel.direction) > FRAME_ALIGNMENT_TOLERANCE) {
    return emptyRifleWeaponPresentationResult(view, "rifle pre-presentation probes are stale");
  }
  const sourceFrameValue = normalizedFrame(liveBarrel.direction, currentAdsY);
  const characterQuaternion = character.getWorldQuaternion(new THREE.Quaternion());
  const targetForward = new THREE.Vector3(0, 0, 1).applyQuaternion(characterQuaternion).normalize();
  const targetUp = new THREE.Vector3(0, 1, 0).applyQuaternion(characterQuaternion).normalize();
  const sourceFrame = sourceFrameValue;
  const targetFrame = normalizedFrame(targetForward, targetUp);
  if (!sourceFrame || !targetFrame) {
    return emptyRifleWeaponPresentationResult(view, "rifle source or target frame is degenerate", { handSpan });
  }
  const deltaQuaternion = alignPoseFrame(
    sourceFrame.forward,
    sourceFrame.up,
    targetFrame.forward,
    targetFrame.up,
  );
  if (!deltaQuaternion || !finiteQuaternion(deltaQuaternion)) {
    return emptyRifleWeaponPresentationResult(view, "rifle measured frame quaternion is invalid", {
      handSpan,
      sourceFrame: frameDiagnostics(sourceFrame),
      targetFrame: frameDiagnostics(targetFrame),
    });
  }
  deltaQuaternion.normalize();
  const bodyRight = targetFrame.right;
  const translation = bodyRight.clone().multiplyScalar(-handSpan)
    .addScaledVector(targetFrame.up, handSpan / 2)
    .addScaledVector(targetFrame.forward, handSpan / 4);
  const worldPositionBefore = weapon.getWorldPosition(new THREE.Vector3());
  const worldPosition = weapon.getWorldPosition(new THREE.Vector3());
  const worldQuaternion = weapon.getWorldQuaternion(new THREE.Quaternion());
  const worldScale = weapon.getWorldScale(new THREE.Vector3());
  const parent = weapon.parent;
  parent.updateWorldMatrix(true, false);
  const parentScale = parent.getWorldScale(new THREE.Vector3());
  const parentDeterminant = parent.matrixWorld.determinant();
  if (!finiteVector(worldPosition)
    || !finiteQuaternion(worldQuaternion)
    || !uniformScale(worldScale)
    || !uniformScale(parentScale)
    || !finiteMatrix(parent.matrixWorld)
    || !Number.isFinite(parentDeterminant)
    || parentDeterminant <= VECTOR_EPSILON_SQ) {
    return emptyRifleWeaponPresentationResult(view, "rifle weapon or parent transform is not finite, uniform, and invertible", {
      handSpan,
      sourceFrame: frameDiagnostics(sourceFrame),
      targetFrame: frameDiagnostics(targetFrame),
      preBarrelDirection: tuple(liveBarrel.direction),
      preAdsY: tuple(currentAdsY),
      worldPositionBefore: tuple(worldPosition),
      worldQuaternionBefore: quaternionTuple(worldQuaternion),
      worldScaleBefore: tuple(worldScale),
      worldMatrixBefore: weapon.matrixWorld.toArray(),
    });
  }
  const rotatedPosition = worldPosition.clone().sub(primary).applyQuaternion(deltaQuaternion).add(primary);
  const desiredPosition = rotatedPosition.add(translation);
  const desiredQuaternion = deltaQuaternion.clone().multiply(worldQuaternion).normalize();
  if (!finiteVector(translation)
    || !finiteVector(desiredPosition)
    || !finiteQuaternion(desiredQuaternion)) {
    return emptyRifleWeaponPresentationResult(view, "rifle desired weapon transform is invalid", { handSpan });
  }
  const desiredWorldMatrix = new THREE.Matrix4().compose(desiredPosition, desiredQuaternion, worldScale);
  const parentInverse = parent.matrixWorld.clone().invert();
  if (!finiteMatrix(parentInverse)) {
    return emptyRifleWeaponPresentationResult(view, "rifle parent inverse is invalid", { handSpan });
  }
  const localMatrix = parentInverse.clone().multiply(desiredWorldMatrix);
  const localPosition = new THREE.Vector3();
  const localQuaternion = new THREE.Quaternion();
  const localScale = new THREE.Vector3();
  localMatrix.decompose(localPosition, localQuaternion, localScale);
  const recomposedLocalMatrix = new THREE.Matrix4().compose(localPosition, localQuaternion, localScale);
  if (!finiteVector(localPosition)
    || !finiteQuaternion(localQuaternion)
    || !uniformScale(localScale)
    || !sameMatrix(localMatrix, recomposedLocalMatrix)) {
    return emptyRifleWeaponPresentationResult(view, "rifle world-to-parent conversion cannot be represented as uniform TRS", { handSpan });
  }

  const snapshot = snapshotRiflePoseTransaction(character, weapon);
  const originalWeaponSnapshot = snapshot.weapon.find((entry) => entry.object === weapon);
  if (!originalWeaponSnapshot || originalWeaponSnapshot.object.parent !== parent) {
    return emptyRifleWeaponPresentationResult(view, "rifle transaction snapshot is incomplete", { handSpan });
  }
  const childOrder = weapon.children.slice();
  const baseResult = {
    view: view as "first" | "third",
    handSpan,
    translation: tuple(translation),
    deltaQuaternion: quaternionTuple(deltaQuaternion),
    sourceFrame: frameDiagnostics(sourceFrame),
    targetFrame: frameDiagnostics(targetFrame),
    preBarrelDirection: tuple(liveBarrel.direction),
    preAdsY: tuple(currentAdsY),
    worldPositionBefore: tuple(worldPosition),
    worldQuaternionBefore: quaternionTuple(worldQuaternion),
    worldScaleBefore: tuple(worldScale),
    worldMatrixBefore: weapon.matrixWorld.toArray(),
  };
  const rollback = (
    reason: string,
    values: Partial<RifleWeaponPresentationResult> = {},
  ): RifleWeaponPresentationResult => {
    restoreRiflePoseTransaction(snapshot, character, weapon);
    return emptyRifleWeaponPresentationResult(view, `rifle measured frame rollback: ${reason}`, {
      ...baseResult,
      ...values,
      rollbackReason: reason,
    });
  };

  weapon.position.copy(localPosition);
  weapon.quaternion.copy(localQuaternion).normalize();
  weapon.scale.copy(localScale);
  weapon.updateMatrixWorld(true);

  if (weapon.parent !== parent
    || weapon.children.some((child, index) => child !== childOrder[index])
    || !sameMatrix(weapon.matrixWorld, desiredWorldMatrix)
    || !uniformScale(weapon.getWorldScale(new THREE.Vector3()))) return rollback("weapon root world transform postcondition failed");
  const worldDelta = desiredWorldMatrix.clone().multiply(originalWeaponSnapshot.worldMatrix.clone().invert());
  if (!finiteMatrix(worldDelta)) return rollback("weapon root world delta is invalid");
  for (const descendant of snapshot.weapon) {
    if (descendant.object !== weapon && !sameLocalTransform(descendant, true)) {
      return rollback("weapon local descendant changed");
    }
    const expectedWorld = descendant.object === weapon
      ? desiredWorldMatrix
      : worldDelta.clone().multiply(descendant.worldMatrix);
    if (!sameMatrix(descendant.object.matrixWorld, expectedWorld)) return rollback("weapon descendant inheritance changed");
  }
  for (const characterNode of snapshot.character) {
    if (isDescendant(weapon, characterNode.object)) continue;
    if (!sameTransform(characterNode, true)) return rollback("non-weapon character transform changed");
  }

  const postPrimary = primaryNode.getWorldPosition(new THREE.Vector3());
  const postSupport = supportNode.getWorldPosition(new THREE.Vector3());
  const postMuzzle = muzzleNode.getWorldPosition(new THREE.Vector3());
  const expectedPoint = (point: THREE.Vector3): THREE.Vector3 => point.clone()
    .sub(primary)
    .applyQuaternion(deltaQuaternion)
    .add(primary)
    .add(translation);
  if (!sameVector(postPrimary, expectedPoint(primary))
    || !sameVector(postSupport, expectedPoint(support))
    || !sameVector(postMuzzle, expectedPoint(muzzle))) return rollback("weapon anchor inheritance is incorrect");
  const postBarrel = measureProbedBarrelAxis(
    { ...frame.barrel, source: "mesh-principal-axis" },
    postMuzzle,
  );
  const postAdsY = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(adsNode.getWorldQuaternion(new THREE.Quaternion()))
    .normalize();
  const expectedBarrel = liveBarrel.direction.clone().applyQuaternion(deltaQuaternion).normalize();
  const expectedAdsY = currentAdsY.clone().applyQuaternion(deltaQuaternion).normalize();
  const postFrame = postBarrel ? normalizedFrame(postBarrel.direction, postAdsY) : null;
  const targetUpError = postFrame ? postFrame.up.angleTo(targetFrame.up) : Infinity;
  const muzzleDirectionError = postBarrel ? postBarrel.direction.angleTo(targetFrame.forward) : Infinity;
  if (!postBarrel
    || !finiteVector(postAdsY)
    || postBarrel.direction.angleTo(expectedBarrel) > FRAME_ALIGNMENT_TOLERANCE
    || postAdsY.angleTo(expectedAdsY) > FRAME_ALIGNMENT_TOLERANCE
    || targetUpError > FRAME_ALIGNMENT_TOLERANCE
    || muzzleDirectionError > FRAME_ALIGNMENT_TOLERANCE) {
    return rollback("post-presentation barrel or ADS frame does not match the target");
  }
  const targetPrimary = primaryArm.hand.getWorldPosition(new THREE.Vector3());
  const targetSupport = supportArm.hand.getWorldPosition(new THREE.Vector3());
  const primaryGripError = postPrimary.distanceTo(targetPrimary);
  const supportGripError = postSupport.distanceTo(targetSupport);
  if (!Number.isFinite(primaryGripError) || !Number.isFinite(supportGripError)) {
    return rollback("post-presentation hand drift is non-finite");
  }
  if (primaryGripError > MAX_GRIP_ERROR || supportGripError > MAX_GRIP_ERROR) {
    return rollback(
      `post-presentation hand contact exceeds tolerance (primary=${primaryGripError.toFixed(4)}m support=${supportGripError.toFixed(4)}m)`,
      { primaryGripError, supportGripError },
    );
  }
  return {
    ...baseResult,
    applied: true,
    reason: "rifle_idle measured weapon frame applied with verified hand contact",
    rollbackReason: null,
    postBarrelDirection: tuple(postBarrel.direction),
    postAdsY: tuple(postAdsY),
    worldPositionAfter: weapon.getWorldPosition(new THREE.Vector3()).toArray() as Vec3Tuple,
    worldQuaternionAfter: quaternionTuple(weapon.getWorldQuaternion(new THREE.Quaternion())),
    worldScaleAfter: tuple(weapon.getWorldScale(new THREE.Vector3())),
    worldMatrixAfter: weapon.matrixWorld.toArray(),
    primaryGripError,
    supportGripError,
    muzzleDirectionError,
  };
}

function missingAuthoredAnchors(anchors: ReturnType<typeof resolveGripAnchors>): string[] {
  return (["primary", "support", "muzzle", "ads"] as const)
    .filter((socket) => {
      const anchor = anchors[socket];
      const knownRifleNode = normalizedName(anchor.nodeName || "") === RIFLE_AUTHORED_NODE_NAMES[socket];
      return anchor.source !== "authored" && !knownRifleNode;
    })
    .map((socket) => `${socket}=${anchors[socket].source}`);
}

export function repositionRifleHands(
  character: THREE.Object3D,
  weapon: THREE.Object3D,
  options: RiflePresentationOptions = {},
): RiflePresentationResult {
  const parameters = presentationParameters(options);
  if (options.weaponId !== "rifle" || options.clipName !== "rifle_idle") {
    return emptyResult(
      parameters,
      "unsupported rifle presentation state: requires weaponId=rifle and clipName=rifle_idle",
    );
  }
  const hands = findHandParts(character);
  if (!hands) return emptyResult(parameters, "rifle arm chains or Index1/Thumb1 roots are unavailable");
  if (!weapon.parent) return emptyResult(parameters, "rifle weapon is unparented");

  character.updateMatrixWorld(true);
  weapon.updateMatrixWorld(true);
  const anchors = resolveGripAnchors(weapon, "rifle");
  const nonAuthoredAnchors = missingAuthoredAnchors(anchors);
  if (nonAuthoredAnchors.length > 0) {
    return emptyResult(
      parameters,
      `rifle requires authored anchor provenance: ${nonAuthoredAnchors.join(", ")}`,
    );
  }
  const gripPoints = {
    primary: worldGripPoint(anchors.primary.point, weapon),
    support: worldGripPoint(anchors.support.point, weapon),
    muzzle: worldGripPoint(anchors.muzzle.point, weapon),
    ads: worldGripPoint(anchors.ads.point, weapon),
  };
  if (!finiteGripPoints(gripPoints)) return emptyResult(parameters, "rifle grip or muzzle frame is non-finite");
  const handSpan = gripPoints.primary.distanceTo(gripPoints.support);
  const weaponForward = gripPoints.muzzle.clone().sub(gripPoints.primary);
  if (!Number.isFinite(handSpan)
    || handSpan < VECTOR_EPSILON_SQ
    || !finiteVector(weaponForward)
    || weaponForward.lengthSq() < VECTOR_EPSILON_SQ) {
    return emptyResult(parameters, "rifle authored muzzle/primary axis is degenerate", { handSpan });
  }
  weaponForward.normalize();
  const leftHandOrigin = hands.left.arm.hand.getWorldPosition(new THREE.Vector3());
  const rightHandOrigin = hands.right.arm.hand.getWorldPosition(new THREE.Vector3());
  const separationAxis = rightHandOrigin.clone().sub(leftHandOrigin);
  if (!finiteVector(leftHandOrigin)
    || !finiteVector(rightHandOrigin)
    || !finiteVector(separationAxis)
    || separationAxis.lengthSq() < VECTOR_EPSILON_SQ) {
    return emptyResult(parameters, "rifle hand-separation axis is degenerate", { handSpan });
  }
  separationAxis.normalize();
  const handAxis = separationAxis.clone().negate();
  const bodyUp = new THREE.Vector3(0, 1, 0).transformDirection(character.matrixWorld);
  const bodyForward = new THREE.Vector3(0, 0, 1).transformDirection(character.matrixWorld);
  if (!finiteVector(bodyUp)
    || bodyUp.lengthSq() < VECTOR_EPSILON_SQ
    || !finiteVector(bodyForward)
    || bodyForward.lengthSq() < VECTOR_EPSILON_SQ) {
    return emptyResult(parameters, "rifle body-up frame is degenerate", { handSpan });
  }
  bodyUp.normalize();
  bodyForward.normalize().addScaledVector(bodyUp, 0.12);
  bodyForward.addScaledVector(separationAxis, -bodyForward.dot(separationAxis));
  if (!finiteVector(bodyForward) || bodyForward.lengthSq() < VECTOR_EPSILON_SQ) {
    return emptyResult(parameters, "rifle pitched body-forward frame is degenerate", { handSpan });
  }
  bodyForward.normalize();
  const palmAxis = bodyForward.clone().cross(separationAxis);
  if (!finiteVector(palmAxis) || palmAxis.lengthSq() < VECTOR_EPSILON_SQ) {
    return emptyResult(parameters, "rifle palm-normal frame is degenerate", { handSpan });
  }
  palmAxis.normalize();
  const leftTarget = targetHandFrame(handAxis, palmAxis.clone().negate());
  const rightTarget = targetHandFrame(handAxis, palmAxis);
  if (!leftTarget || !rightTarget) {
    return emptyResult(parameters, "rifle target hand frame is degenerate", { handSpan });
  }

  const primaryGripError = hands.right.arm.hand
    .getWorldPosition(new THREE.Vector3())
    .distanceTo(gripPoints.primary);
  const supportGripError = hands.left.arm.hand
    .getWorldPosition(new THREE.Vector3())
    .distanceTo(gripPoints.support);
  if (!Number.isFinite(primaryGripError) || !Number.isFinite(supportGripError)) {
    return emptyResult(parameters, "rifle grip contact is non-finite", {
      handSpan,
      primaryGripError,
      supportGripError,
    });
  }
  if (primaryGripError > MAX_GRIP_ERROR || supportGripError > MAX_GRIP_ERROR) {
    return emptyResult(parameters, "rifle grip contact exceeds tolerance", {
      handSpan,
      primaryGripError,
      supportGripError,
    });
  }

  const snapshot = takeExperimentSnapshot(character, weapon, hands, gripPoints);
  const beforeDiagnostics = contactDiagnostics(
    hands,
    gripPoints.primary,
    gripPoints.support,
    weaponForward,
    leftTarget.lateral,
    rightTarget.lateral,
  );
  const beforeOnlyComparison = (reason: string): RifleContactDiagnosticsComparison => ({
    preRotation: beforeDiagnostics,
    postRotation: null,
    orderingPreserved: false,
    contactWithinTolerance: false,
    radialErrorsWithinTolerance: false,
    maxRadialErrorIncrease: 0,
    valid: false,
    reason,
  });
  const wristTwist = new THREE.Quaternion()
    .setFromAxisAngle(rightTarget.forward, parameters.wristTwist)
    .normalize();
  const leftPlan = handFramePlan(
    hands.left.arm.hand,
    hands.left.index.root,
    hands.left.thumb.root,
    leftTarget,
    wristTwist,
  );
  const rightPlan = handFramePlan(
    hands.right.arm.hand,
    hands.right.index.root,
    hands.right.thumb.root,
    rightTarget,
    wristTwist,
  );
  if ("reason" in leftPlan) {
    return emptyResult(parameters, leftPlan.reason, {
      handSpan,
      primaryGripError,
      supportGripError,
      diagnostics: beforeOnlyComparison(leftPlan.reason),
    });
  }
  if ("reason" in rightPlan) {
    return emptyResult(parameters, rightPlan.reason, {
      handSpan,
      primaryGripError,
      supportGripError,
      handFrameError: leftPlan.frameError,
      diagnostics: beforeOnlyComparison(rightPlan.reason),
    });
  }
  const handFrameError = Math.max(leftPlan.frameError, rightPlan.frameError);
  if (!beforeDiagnostics.valid) {
    return emptyResult(parameters, "rifle pre-rotation contact diagnostics are invalid", {
      handSpan,
      primaryGripError,
      supportGripError,
      handFrameError,
      diagnostics: beforeOnlyComparison("rifle pre-rotation contact diagnostics are invalid"),
    });
  }

  leftPlan.hand.quaternion.copy(leftPlan.localQuaternion).normalize();
  rightPlan.hand.quaternion.copy(rightPlan.localQuaternion).normalize();
  character.updateMatrixWorld(true);
  const postHandQuaternionsFinite = finiteQuaternion(leftPlan.hand.quaternion)
    && finiteQuaternion(rightPlan.hand.quaternion);
  const afterDiagnostics = contactDiagnostics(
    hands,
    gripPoints.primary,
    gripPoints.support,
    weaponForward,
    leftTarget.lateral,
    rightTarget.lateral,
  );
  const comparison = compareContactDiagnostics(beforeDiagnostics, afterDiagnostics);
  const currentGripPoints = {
    primary: worldGripPoint(anchors.primary.point, weapon),
    support: worldGripPoint(anchors.support.point, weapon),
    muzzle: worldGripPoint(anchors.muzzle.point, weapon),
    ads: worldGripPoint(anchors.ads.point, weapon),
  };
  const rollback = (reason: string): RiflePresentationResult => {
    restoreExperimentSnapshot(snapshot, character);
    return emptyResult(parameters, `rifle hand-root experiment rollback: ${reason}`, {
      handSpan,
      primaryGripError,
      supportGripError,
      handFrameError,
      diagnostics: comparison,
      }, reason);
  };
  if (!postHandQuaternionsFinite) return rollback("post-rotation hand quaternion is non-finite");
  const postPrimaryGripError = hands.right.arm.hand
    .getWorldPosition(new THREE.Vector3())
    .distanceTo(currentGripPoints.primary);
  const postSupportGripError = hands.left.arm.hand
    .getWorldPosition(new THREE.Vector3())
    .distanceTo(currentGripPoints.support);
  if (!Number.isFinite(postPrimaryGripError)
    || !Number.isFinite(postSupportGripError)
    || postPrimaryGripError > MAX_GRIP_ERROR
    || postSupportGripError > MAX_GRIP_ERROR) {
    return rollback("post-rotation rifle grip contact exceeds tolerance");
  }
  const immutableViolation = immutableTransformViolation(snapshot, hands, weapon, currentGripPoints);
  if (immutableViolation) return rollback(immutableViolation);
  if (!comparison.valid) return rollback(comparison.reason);

  return {
    applied: true,
    reason: "rifle_idle hand-root frame correction applied",
    rollbackReason: null,
    view: parameters.view,
    handSpan,
    primaryGripError,
    supportGripError,
    handFrameApplied: true,
    handFrameError,
    wristTwist: parameters.wristTwist,
    fingerCurl: parameters.fingerCurl,
    fingerCurlAxis: parameters.fingerCurlAxis,
    diagnostics: comparison,
  };
}
