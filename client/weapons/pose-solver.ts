import * as THREE from "three/webgpu";
import { WEAPON_ASSET_DETAILS } from "../../shared/asset-details";
import type { WeaponId } from "../../shared/weapons";
import { PLAYER_BODY_FORWARD } from "../src/systems/player-visual-calibration";
import { applyPlayerHoldFrame, type PlayerHoldFrame } from "./player-hold-ik";

export type GripSocketName = "primary" | "support" | "muzzle" | "ads";
export type GripSocketSource = "authored" | "candidate" | "procedural";

export interface GripAnchor {
  point: THREE.Vector3;
  source: GripSocketSource;
  nodeName?: string;
  direction?: THREE.Vector3;
  invalidDirection?: boolean;
}

export interface GripAnchors {
  primary: GripAnchor;
  support: GripAnchor;
  muzzle: GripAnchor;
  ads: GripAnchor;
}

export interface PoseSolveOptions {
  weaponId?: WeaponId | string;
  poseContext?: string;
  holdFrame?: PlayerHoldFrame;
  forwardPitch?: number;
  scale?: number;
  diagnostics?: boolean;
}

export interface PoseDiagnostics {
  solved: boolean;
  verified: boolean;
  reason?: string;
  weaponScale: number;
  primaryGripError: number;
  supportGripError: number;
  gripSpanError: number;
  gripOrientationError: number;
  muzzleDirectionError: number;
  muzzleDirectionTrusted: boolean;
  shoulderAlignmentError: number;
  elbowBendError: number;
  clipping: {
    checked: boolean;
    proxyComplete: boolean;
    weaponBody: boolean;
    weaponArm: boolean;
    handForearm: boolean;
    maxPenetration: number;
  };
  stable: boolean;
  score: number;
  socketSources: Record<GripSocketName, GripSocketSource>;
  socketNodes: Record<GripSocketName, string | undefined>;
}

export interface PoseCandidate {
  id: string;
  forwardPitch: number;
}

export interface PoseCandidateResult {
  selected: PoseCandidate;
  diagnostics: PoseDiagnostics;
  candidates: Array<{ candidate: PoseCandidate; diagnostics: PoseDiagnostics }>;
}

export const VERIFIED_POSE_CANDIDATES: readonly PoseCandidate[] = [
  { id: "rifle-neutral", forwardPitch: 0 },
  { id: "rifle-low-ready", forwardPitch: -0.12 },
  { id: "rifle-high-ready", forwardPitch: 0.12 },
];

const SNIPER_POSE_CANDIDATES: readonly PoseCandidate[] = [
  { id: "sniper-low-ready", forwardPitch: -0.3 },
];

export const VERIFIED_POSE_THRESHOLDS = {
  handSpan: 0.01,
  gripPosition: 0.035,
  muzzleAngle: 0.35,
  gripOrientation: 0.35,
  maxBodyPenetration: 0.05,
  maxArmPenetration: 0.04,
  minElbowBend: 0.15,
  maxElbowBend: 3.1,
  elbowBendError: 0.001,
};

const SOCKET_NAMES: Record<GripSocketName, string[]> = {
  primary: ["GripPrimary", "tag_trigger", "tag_grip", "trigger", "grip"],
  support: [
    "GripSupport",
    "combat_grip_0233",
    "combat_grip",
    "foregrip_socket_0232",
    "tag_foregrip",
    "foregrip",
    "supportgrip",
  ],
  muzzle: ["Muzzle", "tag_muzzle", "muzzle", "barrel_end"],
  ads: ["ADSReference", "EXPS3_Socket", "exps3_socket", "sdr_socket", "atac_socket", "optic_socket"],
};

interface LocalBounds {
  box: THREE.Box3;
  size: THREE.Vector3;
}

interface SocketCandidate {
  node: THREE.Object3D;
  source: GripSocketSource;
}

interface GeometryProbe {
  node: THREE.Object3D;
  geometry: THREE.BufferGeometry;
  bounds: THREE.Box3;
  relativeMatrix: THREE.Matrix4;
  positionVersion: number;
  indexVersion: number;
  drawRangeStart: number;
  drawRangeCount: number;
  visible: boolean;
}

interface TopologyNode {
  node: THREE.Object3D;
  name: string;
  parent: THREE.Object3D | null;
}

interface PoseCache {
  anchors: GripAnchors;
  weaponBoxes: WeaponBox[];
  geometryProbes: GeometryProbe[];
  geometryProbeByNode: Map<THREE.Object3D, GeometryProbe>;
  topologyNodes: TopologyNode[];
  anchorNodes: Record<GripSocketName, THREE.Object3D | null>;
  sourceAxis: THREE.Vector3;
  sourceUp: THREE.Vector3;
  sourceForward: THREE.Vector3;
  sourceMuzzleDirection: THREE.Vector3;
  sourceHint: THREE.Vector3;
  sourceBasis: THREE.Matrix4;
  sourceBasisInverse: THREE.Matrix4;
  targetAxis: THREE.Vector3;
  targetMuzzleDirection: THREE.Vector3;
  targetUp: THREE.Vector3;
  targetForward: THREE.Vector3;
  bodyForward: THREE.Vector3;
  worldUp: THREE.Vector3;
  leftHand: THREE.Vector3;
  rightHand: THREE.Vector3;
  targetWeaponPosition: THREE.Vector3;
  worldPrimary: THREE.Vector3;
  worldSupport: THREE.Vector3;
  worldMuzzle: THREE.Vector3;
  worldSourceAxis: THREE.Vector3;
  worldSourceUp: THREE.Vector3;
  worldMuzzleDirection: THREE.Vector3;
  rotatedSupport: THREE.Vector3;
  scaleVector: THREE.Vector3;
  targetQuaternion: THREE.Quaternion;
  previousPosition: THREE.Vector3;
  previousQuaternion: THREE.Quaternion;
  worldMatrix: THREE.Matrix4;
  parentInverse: THREE.Matrix4;
  localMatrix: THREE.Matrix4;
  targetBasis: THREE.Matrix4;
  rotationMatrix: THREE.Matrix4;
  anchorRootInverse: THREE.Matrix4;
  geometryProbeMatrix: THREE.Matrix4;
  anchorPointProbe: THREE.Vector3;
  anchorDirectionProbe: THREE.Vector3;
  distanceStart: THREE.Vector3;
  distanceEnd: THREE.Vector3;
  distanceDelta: THREE.Vector3;
  distancePoint: THREE.Vector3;
  distanceSegmentT: number;
  triangleA: THREE.Vector3;
  triangleB: THREE.Vector3;
  triangleC: THREE.Vector3;
  triangleNormal: THREE.Vector3;
  trianglePlaneVector: THREE.Vector3;
  triangleClosestPoint: THREE.Vector3;
  bestTriangleA: THREE.Vector3;
  bestTriangleB: THREE.Vector3;
  bestTriangleC: THREE.Vector3;
  segmentDirectionA: THREE.Vector3;
  segmentDirectionB: THREE.Vector3;
  segmentOffset: THREE.Vector3;
  segmentClosestA: THREE.Vector3;
  segmentClosestB: THREE.Vector3;
  triangle: THREE.Triangle;
  insideRay: THREE.Ray;
  insideRayHit: THREE.Vector3;
  triangleSegmentT: number;
  segmentParameter: number;
  scale: number;
  hasPreviousPose: boolean;
  initialized: boolean;
  weaponKey: string;
  contractKey: string;
  poseContext?: string;
}

const poseCaches = new WeakMap<THREE.Object3D, PoseCache>();

function createPoseCache(): PoseCache {
  return {
    anchors: emptyAnchors(),
    weaponBoxes: [],
    geometryProbes: [],
    geometryProbeByNode: new Map(),
    topologyNodes: [],
    anchorNodes: { primary: null, support: null, muzzle: null, ads: null },
    sourceAxis: new THREE.Vector3(),
    sourceUp: new THREE.Vector3(),
    sourceForward: new THREE.Vector3(),
    sourceMuzzleDirection: new THREE.Vector3(),
    sourceHint: new THREE.Vector3(),
    sourceBasis: new THREE.Matrix4(),
    sourceBasisInverse: new THREE.Matrix4(),
    targetAxis: new THREE.Vector3(),
    targetMuzzleDirection: new THREE.Vector3(),
    targetUp: new THREE.Vector3(),
    targetForward: new THREE.Vector3(),
    bodyForward: new THREE.Vector3(),
    worldUp: new THREE.Vector3(),
    leftHand: new THREE.Vector3(),
    rightHand: new THREE.Vector3(),
    targetWeaponPosition: new THREE.Vector3(),
    worldPrimary: new THREE.Vector3(),
    worldSupport: new THREE.Vector3(),
    worldMuzzle: new THREE.Vector3(),
    worldSourceAxis: new THREE.Vector3(),
    worldSourceUp: new THREE.Vector3(),
    worldMuzzleDirection: new THREE.Vector3(),
    rotatedSupport: new THREE.Vector3(),
    scaleVector: new THREE.Vector3(1, 1, 1),
    targetQuaternion: new THREE.Quaternion(),
    previousPosition: new THREE.Vector3(),
    previousQuaternion: new THREE.Quaternion(),
    worldMatrix: new THREE.Matrix4(),
    parentInverse: new THREE.Matrix4(),
    localMatrix: new THREE.Matrix4(),
    targetBasis: new THREE.Matrix4(),
    rotationMatrix: new THREE.Matrix4(),
    anchorRootInverse: new THREE.Matrix4(),
    geometryProbeMatrix: new THREE.Matrix4(),
    anchorPointProbe: new THREE.Vector3(),
    anchorDirectionProbe: new THREE.Vector3(),
    distanceStart: new THREE.Vector3(),
    distanceEnd: new THREE.Vector3(),
    distanceDelta: new THREE.Vector3(),
    distancePoint: new THREE.Vector3(),
    distanceSegmentT: 0,
    triangleA: new THREE.Vector3(),
    triangleB: new THREE.Vector3(),
    triangleC: new THREE.Vector3(),
    triangleNormal: new THREE.Vector3(),
    trianglePlaneVector: new THREE.Vector3(),
    triangleClosestPoint: new THREE.Vector3(),
    bestTriangleA: new THREE.Vector3(),
    bestTriangleB: new THREE.Vector3(),
    bestTriangleC: new THREE.Vector3(),
    segmentDirectionA: new THREE.Vector3(),
    segmentDirectionB: new THREE.Vector3(),
    segmentOffset: new THREE.Vector3(),
    segmentClosestA: new THREE.Vector3(),
    segmentClosestB: new THREE.Vector3(),
    triangle: new THREE.Triangle(),
    insideRay: new THREE.Ray(
      new THREE.Vector3(),
      new THREE.Vector3(1, 0.371, 0.217).normalize(),
    ),
    insideRayHit: new THREE.Vector3(),
    triangleSegmentT: 0,
    segmentParameter: 0,
    scale: 0,
    hasPreviousPose: false,
    initialized: false,
    weaponKey: "",
    contractKey: "",
  };
}

function emptyAnchor(source: GripSocketSource = "procedural"): GripAnchor {
  return { point: new THREE.Vector3(), source };
}

function emptyAnchors(): GripAnchors {
  return {
    primary: emptyAnchor(),
    support: emptyAnchor(),
    muzzle: emptyAnchor(),
    ads: emptyAnchor(),
  };
}

function normalizedName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function finiteVector(value: THREE.Vector3): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
}

function finiteQuaternion(value: THREE.Quaternion): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y)
    && Number.isFinite(value.z) && Number.isFinite(value.w);
}

function getWeaponDetails(weaponId?: WeaponId | string) {
  const key = getWeaponKey(weaponId);
  return WEAPON_ASSET_DETAILS[key];
}

function getWeaponKey(weaponId?: WeaponId | string): WeaponId {
  if (weaponId === "secondary") return "pistol";
  return weaponId && Object.prototype.hasOwnProperty.call(WEAPON_ASSET_DETAILS, weaponId)
    ? weaponId as WeaponId
    : "rifle";
}

function getWeaponContractKey(weaponId?: WeaponId | string): string {
  const animation = getWeaponDetails(weaponId)?.animation;
  if (!animation) return "";
  const { nodes, muzzleAxis } = animation;
  return [
    nodes.root,
    nodes.gripPrimary,
    nodes.gripSupport,
    nodes.muzzle,
    nodes.adsReference,
    nodes.magazine ?? "",
    muzzleAxis?.join(",") ?? "",
  ].join("|");
}

function addSocketCandidate(
  candidates: SocketCandidate[],
  seen: Set<string>,
  node: THREE.Object3D | null,
  source: GripSocketSource,
): void {
  if (!node || seen.has(node.uuid)) return;
  seen.add(node.uuid);
  candidates.push({ node, source });
}

function findSocketCandidates(
  weapon: THREE.Object3D,
  socket: GripSocketName,
  weaponId?: WeaponId | string,
): SocketCandidate[] {
  const candidates: SocketCandidate[] = [];
  const seen = new Set<string>();
  const contractKey = socket === "primary"
    ? "gripPrimary"
    : socket === "support"
      ? "gripSupport"
      : socket === "muzzle"
        ? "muzzle"
        : "adsReference";
  const contractName = getWeaponDetails(weaponId)?.animation?.nodes?.[contractKey];
  addSocketCandidate(candidates, seen, contractName ? weapon.getObjectByName(contractName) : null, "authored");

  const names = SOCKET_NAMES[socket];
  for (const name of names) addSocketCandidate(candidates, seen, weapon.getObjectByName(name), "candidate");

  const normalizedCandidates = names.map(normalizedName);
  const matches: THREE.Object3D[] = [];
  weapon.traverse((child) => {
    const childName = normalizedName(child.name);
    if (normalizedCandidates.some((candidate) => childName.includes(candidate))) matches.push(child);
  });
  matches.sort((first, second) => {
    const firstEnd = normalizedName(first.name).includes("end") ? 1 : 0;
    const secondEnd = normalizedName(second.name).includes("end") ? 1 : 0;
    return firstEnd - secondEnd;
  });
  for (const match of matches) addSocketCandidate(candidates, seen, match, "candidate");
  return candidates;
}

function computeLocalBounds(weapon: THREE.Object3D): LocalBounds {
  weapon.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(weapon.matrixWorld).invert();
  const relative = new THREE.Matrix4();
  const childBox = new THREE.Box3();
  const box = new THREE.Box3().makeEmpty();

  weapon.traverse((child: any) => {
    if (!child.isMesh || !child.geometry) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    if (!child.geometry.boundingBox) return;
    relative.multiplyMatrices(inverse, child.matrixWorld);
    childBox.copy(child.geometry.boundingBox).applyMatrix4(relative);
    box.union(childBox);
  });

  if (box.isEmpty()) box.set(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5));
  const size = new THREE.Vector3();
  box.getSize(size);
  return { box, size };
}

function collectTopologyNodes(weapon: THREE.Object3D): TopologyNode[] {
  const nodes: TopologyNode[] = [];
  weapon.traverse((child) => nodes.push({ node: child, name: child.name, parent: child.parent }));
  return nodes;
}

function collectGeometryProbes(weapon: THREE.Object3D): GeometryProbe[] {
  const rootInverse = new THREE.Matrix4().copy(weapon.matrixWorld).invert();
  const probes: GeometryProbe[] = [];
  weapon.traverse((child: any) => {
    if (!child.isMesh || !child.geometry) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    if (!child.geometry.boundingBox) return;
    const position = child.geometry.getAttribute("position");
    const index = child.geometry.getIndex();
    probes.push({
      node: child,
      geometry: child.geometry,
      bounds: child.geometry.boundingBox.clone(),
      relativeMatrix: new THREE.Matrix4().multiplyMatrices(rootInverse, child.matrixWorld),
      positionVersion: (position as any)?.version ?? 0,
      indexVersion: (index as any)?.version ?? 0,
      drawRangeStart: child.geometry.drawRange.start,
      drawRangeCount: child.geometry.drawRange.count,
      visible: child.visible,
    });
  });
  return probes;
}

function matrixElementsMatch(first: THREE.Matrix4, second: THREE.Matrix4): boolean {
  const firstElements = first.elements;
  const secondElements = second.elements;
  for (let index = 0; index < 16; index += 1) {
    if (Math.abs(firstElements[index] - secondElements[index]) > 1e-10) return false;
  }
  return true;
}

function boundsMatch(first: THREE.Box3, second: THREE.Box3): boolean {
  return first.min.equals(second.min) && first.max.equals(second.max);
}

function geometryProbesAreCurrent(weapon: THREE.Object3D, cache: PoseCache): boolean {
  cache.anchorRootInverse.copy(weapon.matrixWorld).invert();
  let currentMeshCount = 0;
  let changed = false;
  let topologyIndex = 0;
  weapon.traverse((child: any) => {
    const topologyNode = cache.topologyNodes[topologyIndex++];
    if (!topologyNode || topologyNode.node !== child
      || topologyNode.name !== child.name || topologyNode.parent !== child.parent) changed = true;
    if (!child.isMesh || !child.geometry) return;
    currentMeshCount += 1;
    const probe = cache.geometryProbeByNode.get(child);
    const geometry = child.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute("position");
    const index = geometry.getIndex();
    if (!probe || geometry !== probe.geometry || child.visible !== probe.visible
      || !geometry.boundingBox || !boundsMatch(probe.bounds, geometry.boundingBox)
      || (position as any)?.version !== probe.positionVersion
      || (index as any)?.version !== probe.indexVersion
      || geometry.drawRange.start !== probe.drawRangeStart
      || geometry.drawRange.count !== probe.drawRangeCount) {
      changed = true;
      return;
    }
    cache.geometryProbeMatrix.multiplyMatrices(cache.anchorRootInverse, child.matrixWorld);
    if (!matrixElementsMatch(probe.relativeMatrix, cache.geometryProbeMatrix)) changed = true;
  });
  return !changed
    && currentMeshCount === cache.geometryProbes.length
    && topologyIndex === cache.topologyNodes.length;
}

function pointWithinBounds(point: THREE.Vector3, bounds: LocalBounds): boolean {
  if (!finiteVector(point)) return false;
  const tolerance = Math.max(0.05, Math.max(bounds.size.x, bounds.size.y, bounds.size.z) * 0.25);
  return point.x >= bounds.box.min.x - tolerance && point.x <= bounds.box.max.x + tolerance
    && point.y >= bounds.box.min.y - tolerance && point.y <= bounds.box.max.y + tolerance
    && point.z >= bounds.box.min.z - tolerance && point.z <= bounds.box.max.z + tolerance;
}

function getLongestAxis(size: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  out.set(0, 0, 0);
  if (size.x >= size.y && size.x >= size.z) out.x = 1;
  else if (size.y >= size.x && size.y >= size.z) out.y = 1;
  else out.z = 1;
  return out;
}

function setNodePoint(node: THREE.Object3D | null, rootInverse: THREE.Matrix4, out: THREE.Vector3): boolean {
  if (!node) return false;
  const world = new THREE.Vector3();
  node.getWorldPosition(world);
  if (!finiteVector(world)) return false;
  out.copy(world).applyMatrix4(rootInverse);
  return finiteVector(out);
}

function setNodeDirection(
  node: THREE.Object3D | null,
  rootInverse: THREE.Matrix4,
  localDirection: readonly [number, number, number] | undefined,
  out: THREE.Vector3,
): boolean {
  if (!node || !localDirection) return false;
  out.set(localDirection[0], localDirection[1], localDirection[2]);
  if (out.lengthSq() < 1e-8 || !finiteVector(out)) return false;
  out.transformDirection(node.matrixWorld).transformDirection(rootInverse);
  return finiteVector(out) && out.lengthSq() >= 1e-8;
}

function muzzleCandidateIsAligned(
  node: THREE.Object3D,
  rootInverse: THREE.Matrix4,
  localDirection: readonly [number, number, number] | undefined,
  primary: GripAnchor,
  support: GripAnchor,
): boolean {
  if (primary.source === "procedural" || support.source === "procedural") return true;
  const direction = new THREE.Vector3();
  if (localDirection) {
    if (!setNodeDirection(node, rootInverse, localDirection, direction)) return false;
  } else if (!setNodePoint(node, rootInverse, direction)) {
    return false;
  } else {
    direction.sub(primary.point);
    if (direction.lengthSq() < 1e-8) return false;
  }
  direction.normalize();
  const gripAxis = primary.point.clone().sub(support.point);
  if (gripAxis.lengthSq() < 1e-8) return false;
  gripAxis.normalize();
  return direction.dot(gripAxis) <= -0.98;
}

function projectPerpendicular(direction: THREE.Vector3, reference: THREE.Vector3, out: THREE.Vector3): boolean {
  out.copy(reference).addScaledVector(direction, -reference.dot(direction));
  const lengthSq = out.lengthSq();
  if (!Number.isFinite(lengthSq) || lengthSq < 1e-8) return false;
  out.multiplyScalar(1 / Math.sqrt(lengthSq));
  return true;
}

function choosePerpendicular(direction: THREE.Vector3, out: THREE.Vector3): boolean {
  const x = Math.abs(direction.x);
  const y = Math.abs(direction.y);
  const z = Math.abs(direction.z);
  if (x <= y && x <= z && projectPerpendicular(direction, out.set(1, 0, 0), out)) return true;
  if (y <= z && projectPerpendicular(direction, out.set(0, 1, 0), out)) return true;
  return projectPerpendicular(direction, out.set(0, 0, 1), out);
}

/** Resolve authored socket candidates into weapon-root-local anchor points. */
export function resolveGripAnchors(
  weapon: THREE.Object3D,
  weaponId?: WeaponId | string,
): GripAnchors {
  const bounds = computeLocalBounds(weapon);
  const rootInverse = new THREE.Matrix4().copy(weapon.matrixWorld).invert();
  const anchors = emptyAnchors();
  const center = bounds.box.getCenter(new THREE.Vector3());
  const sizeAxis = getLongestAxis(bounds.size, new THREE.Vector3());
  const usedGripNodes = new Set<string>();
  const sockets: Array<[GripSocketName, GripAnchor]> = [
    ["support", anchors.support],
    ["primary", anchors.primary],
    ["ads", anchors.ads],
  ];

  for (const [socket, anchor] of sockets) {
    for (const candidate of findSocketCandidates(weapon, socket, weaponId)) {
      if ((socket === "primary" || socket === "support") && usedGripNodes.has(candidate.node.uuid)) continue;
      if (setNodePoint(candidate.node, rootInverse, anchor.point) && pointWithinBounds(anchor.point, bounds)) {
        anchor.source = candidate.source;
        anchor.nodeName = candidate.node.name;
        if (socket === "primary" || socket === "support") usedGripNodes.add(candidate.node.uuid);
        break;
      }
    }
  }

  const muzzleCandidates = findSocketCandidates(weapon, "muzzle", weaponId);
  const muzzleAxis = getWeaponDetails(weaponId)?.animation?.muzzleAxis;
  let firstMuzzleCandidate: SocketCandidate | undefined;
  for (const candidate of muzzleCandidates) {
    if (!firstMuzzleCandidate) firstMuzzleCandidate = candidate;
    if (!setNodePoint(candidate.node, rootInverse, anchors.muzzle.point)
      || !pointWithinBounds(anchors.muzzle.point, bounds)) continue;
    if (!muzzleCandidateIsAligned(candidate.node, rootInverse, muzzleAxis, anchors.primary, anchors.support)) continue;
    anchors.muzzle.source = candidate.source;
    anchors.muzzle.nodeName = candidate.node.name;
    const direction = new THREE.Vector3();
    if (setNodeDirection(candidate.node, rootInverse, muzzleAxis, direction)) anchors.muzzle.direction = direction;
    break;
  }
  if (!anchors.muzzle.nodeName && firstMuzzleCandidate
    && setNodePoint(firstMuzzleCandidate.node, rootInverse, anchors.muzzle.point)
    && pointWithinBounds(anchors.muzzle.point, bounds)) {
    anchors.muzzle.source = firstMuzzleCandidate.source;
    anchors.muzzle.nodeName = firstMuzzleCandidate.node.name;
    const direction = new THREE.Vector3();
    if (setNodeDirection(firstMuzzleCandidate.node, rootInverse, muzzleAxis, direction)) anchors.muzzle.direction = direction;
    else if (muzzleAxis) anchors.muzzle.invalidDirection = true;
  }

  const longest = Math.max(bounds.size.x, bounds.size.y, bounds.size.z, 0.1);
  const span = Math.max(0.05, longest * 0.35);
  const sourceAxis = new THREE.Vector3();
  if (anchors.primary.source !== "procedural" && anchors.support.source !== "procedural") {
    sourceAxis.subVectors(anchors.primary.point, anchors.support.point);
  } else if (anchors.support.source !== "procedural" && anchors.muzzle.source !== "procedural") {
    sourceAxis.subVectors(anchors.support.point, anchors.muzzle.point);
  } else {
    sourceAxis.copy(sizeAxis);
  }
  if (!finiteVector(sourceAxis) || sourceAxis.lengthSq() < 1e-8) sourceAxis.copy(sizeAxis);
  sourceAxis.normalize();

  if (anchors.primary.source === "procedural" && anchors.support.source !== "procedural") {
    anchors.primary.point.copy(anchors.support.point).addScaledVector(sourceAxis, span);
  } else if (anchors.support.source === "procedural" && anchors.primary.source !== "procedural") {
    anchors.support.point.copy(anchors.primary.point).addScaledVector(sourceAxis, -span);
  } else if (anchors.primary.source === "procedural" && anchors.support.source === "procedural") {
    anchors.primary.point.copy(center).addScaledVector(sourceAxis, span * 0.5);
    anchors.support.point.copy(center).addScaledVector(sourceAxis, -span * 0.5);
  }

  if (anchors.muzzle.source === "procedural") {
    anchors.muzzle.point.copy(anchors.primary.point).addScaledVector(sourceAxis, -Math.max(span, longest * 0.2));
    const muzzleAxis = getWeaponDetails(weaponId)?.animation?.muzzleAxis;
    if (muzzleAxis) {
      const metadataDirection = new THREE.Vector3(muzzleAxis[0], muzzleAxis[1], muzzleAxis[2]);
      if (finiteVector(metadataDirection) && metadataDirection.lengthSq() >= 1e-8) {
        metadataDirection.normalize();
        anchors.muzzle.direction = metadataDirection;
        anchors.muzzle.point.copy(anchors.primary.point)
          .addScaledVector(metadataDirection, Math.max(span, longest * 0.2));
      } else {
        anchors.muzzle.invalidDirection = true;
      }
    }
  }
  if (anchors.ads.source === "procedural") {
    const adsDirection = new THREE.Vector3();
    choosePerpendicular(sourceAxis, adsDirection);
    anchors.ads.point.copy(anchors.primary.point).addScaledVector(adsDirection, Math.max(0.05, longest * 0.15));
  }
  return anchors;
}

function findNamedBone(character: THREE.Object3D, names: string[]): THREE.Object3D | null {
  for (const name of names) {
    const exact = character.getObjectByName(name);
    if (exact) return exact;
    const wanted = normalizedName(name);
    let found: THREE.Object3D | null = null;
    character.traverse((child) => {
      if (!found) {
        const childName = normalizedName(child.name);
        if (childName === wanted || childName.endsWith(wanted)) found = child;
      }
    });
    if (found) return found;
  }
  return null;
}

function findBone(character: THREE.Object3D, side: "Left" | "Right", joint: "Shoulder" | "ForeArm" | "Hand"): THREE.Object3D | null {
  const jointName = joint === "ForeArm" ? "fore_arm" : joint.toLowerCase();
  const armAlias = joint === "Shoulder" ? "top" : joint === "ForeArm" ? "bot" : "hand";
  const names = joint === "Shoulder"
    ? [
      `mixamorig:${side}Arm`,
      `mixamorig${side}Arm`,
      `${side}Arm`,
      `arm_${side.toLowerCase()}_arm`,
      `arm_${side.toLowerCase()}_${armAlias}`,
      `mixamorig:${side}${joint}`,
      `mixamorig${side}${joint}`,
      `${side}${joint}`,
    ]
    : [
      `mixamorig:${side}${joint}`,
      `mixamorig${side}${joint}`,
      `${side}${joint}`,
      `arm_${side.toLowerCase()}_${jointName}`,
      `arm_${side.toLowerCase()}_${armAlias}`,
    ];
  return findNamedBone(character, names);
}

function findBodyBone(character: THREE.Object3D, joint: string): THREE.Object3D | null {
  return findNamedBone(character, [`mixamorig:${joint}`, joint, joint.toLowerCase()]);
}

function copyCharacterHands(character: THREE.Object3D, cache: PoseCache): boolean {
  const proxy = getCharacterProxyCache(character);
  const leftHand = proxy.armBones[0]?.hand;
  const rightHand = proxy.armBones[1]?.hand;
  if (!leftHand || !rightHand) return false;
  character.updateMatrixWorld(true);
  leftHand.getWorldPosition(cache.leftHand);
  rightHand.getWorldPosition(cache.rightHand);
  return finiteVector(cache.leftHand) && finiteVector(cache.rightHand);
}

function buildSourceBasis(cache: PoseCache): string | null {
  cache.sourceAxis.subVectors(cache.anchors.primary.point, cache.anchors.support.point);
  if (!finiteVector(cache.sourceAxis) || cache.sourceAxis.lengthSq() < 1e-8) return "invalid weapon grip axis";
  cache.sourceAxis.normalize();

  if (cache.anchors.muzzle.direction) cache.sourceMuzzleDirection.copy(cache.anchors.muzzle.direction);
  else cache.sourceMuzzleDirection.subVectors(cache.anchors.muzzle.point, cache.anchors.primary.point);
  if (cache.anchors.muzzle.invalidDirection) return "invalid authored muzzle axis";
  if (!finiteVector(cache.sourceMuzzleDirection) || cache.sourceMuzzleDirection.lengthSq() < 1e-8) return "invalid weapon muzzle axis";
  cache.sourceMuzzleDirection.normalize();
  const signedMuzzleAlignment = cache.sourceMuzzleDirection.dot(cache.sourceAxis);
  if (cache.anchors.muzzle.source !== "procedural" && signedMuzzleAlignment > -0.98) {
    return `invalid ${cache.anchors.muzzle.source} muzzle axis`;
  }

  cache.sourceForward.copy(cache.sourceMuzzleDirection);
  if (!projectPerpendicular(cache.sourceAxis, cache.sourceForward, cache.sourceForward)) {
    cache.sourceHint.subVectors(cache.anchors.ads.point, cache.anchors.primary.point);
    if (!projectPerpendicular(cache.sourceAxis, cache.sourceHint, cache.sourceForward)
      && !choosePerpendicular(cache.sourceAxis, cache.sourceForward)) return "invalid weapon roll basis";
  }
  cache.sourceUp.crossVectors(cache.sourceForward, cache.sourceAxis);
  if (!finiteVector(cache.sourceUp) || cache.sourceUp.lengthSq() < 1e-8) return "invalid weapon roll axis";
  cache.sourceUp.normalize();
  cache.sourceBasis.makeBasis(cache.sourceAxis, cache.sourceUp, cache.sourceForward);
  cache.sourceBasisInverse.copy(cache.sourceBasis).invert();
  return null;
}

function buildTargetBasis(character: THREE.Object3D, cache: PoseCache, forwardPitch: number): boolean {
  cache.targetAxis.subVectors(cache.rightHand, cache.leftHand);
  const handSpan = cache.targetAxis.length();
  if (!Number.isFinite(handSpan) || handSpan < VERIFIED_POSE_THRESHOLDS.handSpan) return false;
  cache.targetAxis.multiplyScalar(1 / handSpan);

  cache.bodyForward.set(
    PLAYER_BODY_FORWARD.x,
    PLAYER_BODY_FORWARD.y,
    PLAYER_BODY_FORWARD.z,
  ).transformDirection(character.matrixWorld);
  cache.worldUp.set(0, 1, 0).transformDirection(character.matrixWorld);
  if (!finiteVector(cache.bodyForward) || !finiteVector(cache.worldUp)) return false;
  const pitch = Number.isFinite(forwardPitch) ? Math.max(-0.5, Math.min(0.5, forwardPitch)) : 0;
  cache.bodyForward.addScaledVector(cache.worldUp, pitch).normalize();
  cache.targetMuzzleDirection.copy(cache.targetAxis).multiplyScalar(-1);

  cache.targetForward.copy(cache.bodyForward);
  if (!projectPerpendicular(cache.targetAxis, cache.targetForward, cache.targetForward)
    && !projectPerpendicular(cache.targetAxis, cache.worldUp, cache.targetForward)
    && !choosePerpendicular(cache.targetAxis, cache.targetForward)) return false;
  cache.targetUp.crossVectors(cache.targetForward, cache.targetAxis);
  if (!finiteVector(cache.targetUp) || cache.targetUp.lengthSq() < 1e-8) return false;
  cache.targetUp.normalize();

  cache.targetBasis.makeBasis(cache.targetAxis, cache.targetUp, cache.targetForward);
  cache.rotationMatrix.multiplyMatrices(cache.targetBasis, cache.sourceBasisInverse);
  cache.targetQuaternion.setFromRotationMatrix(cache.rotationMatrix);
  return finiteQuaternion(cache.targetQuaternion);
}

function getPoseCache(weapon: THREE.Object3D): PoseCache {
  const existing = poseCaches.get(weapon);
  if (existing) return existing;
  const cache = createPoseCache();
  poseCaches.set(weapon, cache);
  return cache;
}

function clampScale(scale: number): number {
  return Math.max(0.001, Math.min(4, Number.isFinite(scale) ? scale : 0.015));
}

function cacheAnchorNodes(weapon: THREE.Object3D, cache: PoseCache): void {
  for (const socket of ["primary", "support", "muzzle", "ads"] as const) {
    const nodeName = cache.anchors[socket].nodeName;
    cache.anchorNodes[socket] = nodeName ? weapon.getObjectByName(nodeName) : null;
  }
}

function anchorNodesAreCurrent(
  weapon: THREE.Object3D,
  cache: PoseCache,
  weaponId?: WeaponId | string,
): boolean {
  if (!geometryProbesAreCurrent(weapon, cache)) return false;
  cache.anchorRootInverse.copy(weapon.matrixWorld).invert();
  const muzzleAxis = getWeaponDetails(weaponId)?.animation?.muzzleAxis;
  for (const socket of ["primary", "support", "muzzle", "ads"] as const) {
    const node = cache.anchorNodes[socket];
    const anchor = cache.anchors[socket];
    if (!anchor.nodeName) {
      if (node !== null) return false;
      continue;
    }
    if (!node || node.name !== anchor.nodeName) return false;
    if (!node.parent || !setNodePoint(node, cache.anchorRootInverse, cache.anchorPointProbe)) return false;
    if (cache.anchorPointProbe.distanceToSquared(anchor.point) > 1e-12) return false;
    if (socket !== "muzzle" || !muzzleAxis) continue;
    const hasDirection = setNodeDirection(node, cache.anchorRootInverse, muzzleAxis, cache.anchorDirectionProbe);
    if (anchor.invalidDirection ? hasDirection : !hasDirection) return false;
    if (anchor.direction && cache.anchorDirectionProbe.distanceToSquared(anchor.direction) > 1e-12) return false;
  }
  return true;
}

function refreshPoseCache(weapon: THREE.Object3D, cache: PoseCache, weaponId?: WeaponId | string): string | null {
  const weaponKey = getWeaponKey(weaponId);
  const contractKey = getWeaponContractKey(weaponId);
  if (cache.initialized
    && cache.weaponKey === weaponKey
    && cache.contractKey === contractKey
    && anchorNodesAreCurrent(weapon, cache, weaponId)) {
    return null;
  }

  const resolvedAnchors = resolveGripAnchors(weapon, weaponId);
  cache.anchors = resolvedAnchors;
  cache.weaponKey = weaponKey;
  cache.contractKey = contractKey;
  cacheAnchorNodes(weapon, cache);
  cache.weaponBoxes = collectWeaponBoxes(weapon, weaponId);
  cache.geometryProbes = collectGeometryProbes(weapon);
  cache.geometryProbeByNode.clear();
  for (const probe of cache.geometryProbes) cache.geometryProbeByNode.set(probe.node, probe);
  cache.topologyNodes = collectTopologyNodes(weapon);
  cache.scale = 0;
  cache.hasPreviousPose = false;
  const error = buildSourceBasis(cache);
  cache.initialized = !error;
  return error;
}

function makeFailedDiagnostics(reason: string, anchors?: GripAnchors): PoseDiagnostics {
  return {
    solved: false,
    verified: false,
    reason,
    weaponScale: 0,
    primaryGripError: Infinity,
    supportGripError: Infinity,
    gripSpanError: Infinity,
    gripOrientationError: Infinity,
    muzzleDirectionError: Infinity,
    muzzleDirectionTrusted: false,
    shoulderAlignmentError: Infinity,
    elbowBendError: Infinity,
    clipping: { checked: false, proxyComplete: false, weaponBody: false, weaponArm: false, handForearm: false, maxPenetration: 0 },
    stable: false,
    score: Infinity,
    socketSources: {
      primary: anchors?.primary.source ?? "procedural",
      support: anchors?.support.source ?? "procedural",
      muzzle: anchors?.muzzle.source ?? "procedural",
      ads: anchors?.ads.source ?? "procedural",
    },
    socketNodes: {
      primary: anchors?.primary.nodeName,
      support: anchors?.support.nodeName,
      muzzle: anchors?.muzzle.nodeName,
      ads: anchors?.ads.nodeName,
    },
  };
}

type ProxySegmentKind = "body" | "arm" | "forearm";

interface ProxySegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  kind: ProxySegmentKind;
}

interface CharacterProxyCache {
  bodyBones: Array<{ bone: THREE.Object3D | null; radius: number }>;
  armBones: Array<{
    shoulder: THREE.Object3D | null;
    elbow: THREE.Object3D | null;
    hand: THREE.Object3D | null;
  }>;
  segments: ProxySegment[];
  currentPoint: THREE.Vector3;
  previousPoint: THREE.Vector3;
  segmentDirection: THREE.Vector3;
  shoulderPoint: THREE.Vector3;
  elbowPoint: THREE.Vector3;
  handPoint: THREE.Vector3;
}

const BODY_PROXY_SPECS: Array<[string, number]> = [
  ["Hips", 0.2],
  ["Spine", 0.18],
  ["Spine1", 0.18],
  ["Spine2", 0.18],
  ["Neck", 0.15],
  ["Head", 0.16],
];

const characterProxyCaches = new WeakMap<THREE.Object3D, CharacterProxyCache>();

interface WeaponBox {
  node: THREE.Object3D;
  position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | null;
  triangleIndices: number[];
  closed: boolean;
  bounds: THREE.Box3;
  inverse: THREE.Matrix4;
  worldScale: number;
  allowsTorsoContact: boolean;
}

function writeProxySegment(
  proxy: CharacterProxyCache,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  kind: ProxySegmentKind,
  trimEnd = 0,
): boolean {
  proxy.segmentDirection.subVectors(end, start);
  const length = proxy.segmentDirection.length();
  if (!Number.isFinite(length) || length < 1e-5) return false;
  proxy.segmentDirection.multiplyScalar(1 / length);
  const segment = proxy.segments[proxy.segments.length] || {
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    radius,
    kind,
  };
  segment.start.copy(start);
  segment.end.copy(end).addScaledVector(proxy.segmentDirection, -Math.min(trimEnd, length * 0.5));
  segment.radius = radius;
  segment.kind = kind;
  proxy.segments.push(segment);
  return true;
}

function getCharacterProxyCache(character: THREE.Object3D): CharacterProxyCache {
  const existing = characterProxyCaches.get(character);
  if (existing) return existing;

  const proxy: CharacterProxyCache = {
    bodyBones: BODY_PROXY_SPECS.map(([joint, radius]) => ({ bone: findBodyBone(character, joint), radius })),
    armBones: (["Left", "Right"] as const).map((side) => ({
      shoulder: findBone(character, side, "Shoulder"),
      elbow: findBone(character, side, "ForeArm"),
      hand: findBone(character, side, "Hand"),
    })),
    segments: [],
    currentPoint: new THREE.Vector3(),
    previousPoint: new THREE.Vector3(),
    segmentDirection: new THREE.Vector3(),
    shoulderPoint: new THREE.Vector3(),
    elbowPoint: new THREE.Vector3(),
    handPoint: new THREE.Vector3(),
  };
  characterProxyCaches.set(character, proxy);
  return proxy;
}

interface CharacterProxySegments {
  segments: ProxySegment[];
  complete: boolean;
  elbowBendError: number;
}

function collectCharacterProxySegments(character: THREE.Object3D): CharacterProxySegments {
  const proxy = getCharacterProxyCache(character);

  const segments = proxy.segments;
  segments.length = 0;
  let previousBodyPoint: THREE.Vector3 | null = null;
  let bodyPointCount = 0;
  let bodySegmentCount = 0;
  let bodyChainComplete = true;
  for (const { bone, radius } of proxy.bodyBones) {
    if (!bone) {
      bodyChainComplete = false;
      previousBodyPoint = null;
      continue;
    }
    bone.getWorldPosition(proxy.currentPoint);
    if (!finiteVector(proxy.currentPoint)) {
      bodyChainComplete = false;
      previousBodyPoint = null;
      continue;
    }
    if (previousBodyPoint && writeProxySegment(proxy, previousBodyPoint, proxy.currentPoint, radius, "body")) bodySegmentCount += 1;
    proxy.previousPoint.copy(proxy.currentPoint);
    previousBodyPoint = proxy.previousPoint;
    bodyPointCount += 1;
  }

  let armSegmentCount = 0;
  let forearmSegmentCount = 0;
  let armsComplete = true;
  for (const { shoulder, elbow, hand } of proxy.armBones) {
    if (!shoulder || !elbow || !hand) {
      armsComplete = false;
      continue;
    }
    shoulder.getWorldPosition(proxy.previousPoint);
    elbow.getWorldPosition(proxy.currentPoint);
    if (!finiteVector(proxy.previousPoint) || !finiteVector(proxy.currentPoint)) {
      armsComplete = false;
      continue;
    }
    if (writeProxySegment(proxy, proxy.previousPoint, proxy.currentPoint, 0.07, "arm")) armSegmentCount += 1;
    elbow.getWorldPosition(proxy.previousPoint);
    hand.getWorldPosition(proxy.currentPoint);
    if (!finiteVector(proxy.previousPoint) || !finiteVector(proxy.currentPoint)) {
      armsComplete = false;
      continue;
    }
    if (writeProxySegment(proxy, proxy.previousPoint, proxy.currentPoint, 0.055, "forearm", 0.1)) forearmSegmentCount += 1;
  }

  const upperTorso = proxy.bodyBones[3]?.bone;
  if (upperTorso) {
    upperTorso.getWorldPosition(proxy.previousPoint);
    for (const { shoulder } of proxy.armBones) {
      if (!shoulder) continue;
      shoulder.getWorldPosition(proxy.currentPoint);
      writeProxySegment(proxy, proxy.previousPoint, proxy.currentPoint, 0.12, "body");
    }
  }

  let elbowBendTotal = 0;
  let elbowBendCount = 0;
  for (const { shoulder, elbow, hand } of proxy.armBones) {
    if (!shoulder || !elbow || !hand) continue;
    shoulder.getWorldPosition(proxy.shoulderPoint);
    elbow.getWorldPosition(proxy.elbowPoint);
    hand.getWorldPosition(proxy.handPoint);
    const first = proxy.shoulderPoint.sub(proxy.elbowPoint);
    const second = proxy.handPoint.sub(proxy.elbowPoint);
    if (first.lengthSq() < 1e-8 || second.lengthSq() < 1e-8) continue;
    const bend = Math.acos(Math.max(-1, Math.min(1, first.normalize().dot(second.normalize()))));
    elbowBendTotal += bend < VERIFIED_POSE_THRESHOLDS.minElbowBend
      ? VERIFIED_POSE_THRESHOLDS.minElbowBend - bend
      : bend > VERIFIED_POSE_THRESHOLDS.maxElbowBend
        ? bend - VERIFIED_POSE_THRESHOLDS.maxElbowBend
        : 0;
    elbowBendCount += 1;
  }

  return {
    segments,
    complete: bodyChainComplete
      && bodyPointCount === BODY_PROXY_SPECS.length
      && bodySegmentCount === BODY_PROXY_SPECS.length - 1
      && armSegmentCount === 2
      && forearmSegmentCount === 2
      && armsComplete,
    elbowBendError: elbowBendCount > 0 ? elbowBendTotal / elbowBendCount : 0,
  };
}

function isMagazinePart(
  object: THREE.Object3D,
  weapon: THREE.Object3D,
  weaponId?: WeaponId | string,
): boolean {
  const configuredName = getWeaponDetails(weaponId)?.animation?.nodes.magazine;
  const configured = configuredName ? normalizedName(configuredName) : "";
  let node: THREE.Object3D | null = object;
  while (node) {
    const normalized = normalizedName(node.name);
    if (configured && normalized === configured) return true;
    if (normalized.includes("magazine") || /(?:mag|magazine)(?:[_-]|$)/i.test(node.name)) return true;
    if (node === weapon) break;
    node = node.parent;
  }
  return false;
}

interface GeometryComponent {
  bounds: THREE.Box3;
  triangleIndices: number[];
  closed: boolean;
}

function collectGeometryComponentBounds(geometry: THREE.BufferGeometry): GeometryComponent[] {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const triangleIndexCount = index?.count ?? position?.count ?? 0;
  if (!position || triangleIndexCount < 3) {
    return geometry.boundingBox
      ? [{ bounds: geometry.boundingBox.clone(), triangleIndices: [], closed: false }]
      : [];
  }

  const parent = Array.from({ length: position.count }, (_, vertex) => vertex);
  const find = (vertex: number): number => {
    let root = vertex;
    while (parent[root] !== root) root = parent[root];
    while (parent[vertex] !== vertex) {
      const next = parent[vertex];
      parent[vertex] = root;
      vertex = next;
    }
    return root;
  };
  const union = (first: number, second: number): void => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parent[secondRoot] = firstRoot;
  };

  const vertexKeys = new Array<string>(position.count);
  const weldedVertices = new Map<string, number>();
  const weldPoint = new THREE.Vector3();
  for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex += 1) {
    weldPoint.fromBufferAttribute(position, vertexIndex);
    const key = `${Math.round(weldPoint.x * 1e6)}:${Math.round(weldPoint.y * 1e6)}:${Math.round(weldPoint.z * 1e6)}`;
    vertexKeys[vertexIndex] = key;
    const existing = weldedVertices.get(key);
    if (existing === undefined) weldedVertices.set(key, vertexIndex);
    else union(vertexIndex, existing);
  }

  const getVertexIndex = (offset: number): number => index?.getX(offset) ?? offset;
  for (let offset = 0; offset + 2 < triangleIndexCount; offset += 3) {
    const first = getVertexIndex(offset);
    const second = getVertexIndex(offset + 1);
    const third = getVertexIndex(offset + 2);
    if (first < position.count && second < position.count && third < position.count) {
      union(first, second);
      union(second, third);
    }
  }

  const componentBounds = new Map<number, {
    bounds: THREE.Box3;
    triangleIndices: number[];
    edgeCounts: Map<string, number>;
  }>();
  const vertex = new THREE.Vector3();
  for (let offset = 0; offset + 2 < triangleIndexCount; offset += 3) {
    const first = getVertexIndex(offset);
    const second = getVertexIndex(offset + 1);
    const third = getVertexIndex(offset + 2);
    if (first < 0 || second < 0 || third < 0
      || first >= position.count || second >= position.count || third >= position.count) continue;
    const root = find(first);
    let component = componentBounds.get(root);
    if (!component) {
      component = {
        bounds: new THREE.Box3().makeEmpty(),
        triangleIndices: [],
        edgeCounts: new Map(),
      };
      componentBounds.set(root, component);
    }
    for (const vertexIndex of [first, second, third]) {
      component.bounds.expandByPoint(vertex.fromBufferAttribute(position, vertexIndex));
    }
    component.triangleIndices.push(first, second, third);
    for (const [start, end] of [[first, second], [second, third], [third, first]]) {
      const startKey = vertexKeys[start];
      const endKey = vertexKeys[end];
      const edge = startKey < endKey ? `${startKey}:${endKey}` : `${endKey}:${startKey}`;
      component.edgeCounts.set(edge, (component.edgeCounts.get(edge) ?? 0) + 1);
    }
  }

  return componentBounds.size > 0
    ? [...componentBounds.values()].map(({ bounds, triangleIndices, edgeCounts }) => ({
      bounds,
      triangleIndices,
      closed: edgeCounts.size > 0 && [...edgeCounts.values()].every((count) => count === 2),
    }))
    : geometry.boundingBox
      ? [{ bounds: geometry.boundingBox.clone(), triangleIndices: [], closed: false }]
      : [];
}

function collectWeaponBoxes(weapon: THREE.Object3D, weaponId?: WeaponId | string): WeaponBox[] {
  const boxes: WeaponBox[] = [];
  weapon.traverse((child: any) => {
    if (!child.isMesh || !child.visible || !child.geometry) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    if (!child.geometry.boundingBox) return;
    const inverse = new THREE.Matrix4().copy(child.matrixWorld).invert();
    const basisX = new THREE.Vector3().setFromMatrixColumn(child.matrixWorld, 0).length();
    const basisY = new THREE.Vector3().setFromMatrixColumn(child.matrixWorld, 1).length();
    const basisZ = new THREE.Vector3().setFromMatrixColumn(child.matrixWorld, 2).length();
    const worldScale = Math.min(basisX, basisY, basisZ);
    if (!Number.isFinite(worldScale) || worldScale <= 1e-8) return;
    const position = child.geometry.getAttribute("position") as THREE.BufferAttribute | THREE.InterleavedBufferAttribute | null;
    for (const component of collectGeometryComponentBounds(child.geometry)) {
      boxes.push({
        node: child,
        position,
        triangleIndices: component.triangleIndices,
        closed: component.closed,
        bounds: component.bounds,
        inverse: inverse.clone(),
        worldScale,
        allowsTorsoContact: isMagazinePart(child, weapon, weaponId),
      });
    }
  });
  return boxes;
}

function refreshWeaponBoxes(boxes: WeaponBox[]): void {
  for (const box of boxes) {
    if (!box.node.visible) continue;
    box.inverse.copy(box.node.matrixWorld).invert();
    const elements = box.node.matrixWorld.elements;
    box.worldScale = Math.min(
      Math.hypot(elements[0], elements[1], elements[2]),
      Math.hypot(elements[4], elements[5], elements[6]),
      Math.hypot(elements[8], elements[9], elements[10]),
    );
  }
}

function distanceAtSegmentT(
  start: THREE.Vector3,
  delta: THREE.Vector3,
  segmentT: number,
  bounds: THREE.Box3,
  point: THREE.Vector3,
): number {
  return bounds.distanceToPoint(point.copy(start).addScaledVector(delta, segmentT));
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function distanceSegmentToSegmentSquared(
  firstStart: THREE.Vector3,
  firstEnd: THREE.Vector3,
  secondStart: THREE.Vector3,
  secondEnd: THREE.Vector3,
  cache: PoseCache,
): number {
  const firstDirection = cache.segmentDirectionA.subVectors(firstEnd, firstStart);
  const secondDirection = cache.segmentDirectionB.subVectors(secondEnd, secondStart);
  const offset = cache.segmentOffset.subVectors(firstStart, secondStart);
  const a = firstDirection.dot(firstDirection);
  const e = secondDirection.dot(secondDirection);
  const f = secondDirection.dot(offset);
  let firstT = 0;
  let secondT = 0;

  if (a <= 1e-12 && e <= 1e-12) {
    cache.segmentClosestA.copy(firstStart);
    cache.segmentClosestB.copy(secondStart);
    cache.segmentParameter = 0;
    return cache.segmentClosestA.distanceToSquared(cache.segmentClosestB);
  }
  if (a <= 1e-12) {
    secondT = clampUnit(f / e);
  } else {
    const c = firstDirection.dot(offset);
    if (e <= 1e-12) {
      firstT = clampUnit(-c / a);
    } else {
      const b = firstDirection.dot(secondDirection);
      const denominator = a * e - b * b;
      firstT = denominator !== 0 ? clampUnit((b * f - c * e) / denominator) : 0;
      secondT = (b * firstT + f) / e;
      if (secondT < 0) {
        secondT = 0;
        firstT = clampUnit(-c / a);
      } else if (secondT > 1) {
        secondT = 1;
        firstT = clampUnit((b - c) / a);
      }
    }
  }

  cache.segmentClosestA.copy(firstStart).addScaledVector(firstDirection, firstT);
  cache.segmentClosestB.copy(secondStart).addScaledVector(secondDirection, secondT);
  cache.segmentParameter = firstT;
  return cache.segmentClosestA.distanceToSquared(cache.segmentClosestB);
}

function distanceSegmentToTriangle(
  start: THREE.Vector3,
  end: THREE.Vector3,
  first: THREE.Vector3,
  second: THREE.Vector3,
  third: THREE.Vector3,
  cache: PoseCache,
): number {
  cache.triangle.set(first, second, third);
  let bestDistanceSq = Infinity;
  let bestT = 0;
  const consider = (distanceSq: number, segmentT: number): void => {
    if (distanceSq >= bestDistanceSq) return;
    bestDistanceSq = distanceSq;
    bestT = segmentT;
  };

  cache.triangle.closestPointToPoint(start, cache.triangleClosestPoint);
  consider(cache.triangleClosestPoint.distanceToSquared(start), 0);
  cache.triangle.closestPointToPoint(end, cache.triangleClosestPoint);
  consider(cache.triangleClosestPoint.distanceToSquared(end), 1);

  const segmentDirection = cache.distanceDelta.subVectors(end, start);
  const planeVector = cache.trianglePlaneVector.subVectors(third, first);
  const normal = cache.triangleNormal.subVectors(second, first).cross(planeVector);
  if (normal.lengthSq() > 1e-12) {
    const denominator = normal.dot(segmentDirection);
    if (Math.abs(denominator) > 1e-12) {
      const planeOffset = cache.trianglePlaneVector.subVectors(first, start);
      const segmentT = normal.dot(planeOffset) / denominator;
      if (segmentT >= 0 && segmentT <= 1) {
        const planePoint = cache.distancePoint.copy(start).addScaledVector(segmentDirection, segmentT);
        if (THREE.Triangle.containsPoint(planePoint, first, second, third)) {
          cache.triangleSegmentT = segmentT;
          return 0;
        }
      }
    }
  }

  consider(distanceSegmentToSegmentSquared(start, end, first, second, cache), cache.segmentParameter);
  consider(distanceSegmentToSegmentSquared(start, end, second, third, cache), cache.segmentParameter);
  consider(distanceSegmentToSegmentSquared(start, end, third, first, cache), cache.segmentParameter);
  cache.triangleSegmentT = bestT;
  return Math.sqrt(bestDistanceSq);
}

function pointInsideClosedWeaponComponent(
  point: THREE.Vector3,
  weaponBox: WeaponBox,
  cache: PoseCache,
): boolean {
  if (!weaponBox.closed || !weaponBox.position || weaponBox.triangleIndices.length < 3) return false;
  cache.insideRay.origin.copy(point);
  let intersectionCount = 0;
  for (let offset = 0; offset + 2 < weaponBox.triangleIndices.length; offset += 3) {
    const firstIndex = weaponBox.triangleIndices[offset];
    const secondIndex = weaponBox.triangleIndices[offset + 1];
    const thirdIndex = weaponBox.triangleIndices[offset + 2];
    cache.triangleA.fromBufferAttribute(weaponBox.position, firstIndex);
    cache.triangleB.fromBufferAttribute(weaponBox.position, secondIndex);
    cache.triangleC.fromBufferAttribute(weaponBox.position, thirdIndex);
    if (!cache.insideRay.intersectTriangle(
      cache.triangleA,
      cache.triangleB,
      cache.triangleC,
      false,
      cache.insideRayHit,
    )) continue;
    if (cache.insideRayHit.sub(point).dot(cache.insideRay.direction) > 1e-8) intersectionCount += 1;
  }
  return intersectionCount % 2 === 1;
}

function distanceSegmentToWeaponBounds(
  segment: ProxySegment,
  weaponBox: WeaponBox,
  cache: PoseCache,
): number {
  const start = cache.distanceStart.copy(segment.start).applyMatrix4(weaponBox.inverse);
  const end = cache.distanceEnd.copy(segment.end).applyMatrix4(weaponBox.inverse);
  const delta = cache.distanceDelta.subVectors(end, start);
  let bestT = 0;
  let bestDistance = distanceAtSegmentT(start, delta, 0, weaponBox.bounds, cache.distancePoint);
  const endDistance = distanceAtSegmentT(start, delta, 1, weaponBox.bounds, cache.distancePoint);
  if (endDistance < bestDistance) {
    bestDistance = endDistance;
    bestT = 1;
  }

  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 16; iteration += 1) {
    const firstT = low + (high - low) / 3;
    const secondT = high - (high - low) / 3;
    const firstDistance = distanceAtSegmentT(start, delta, firstT, weaponBox.bounds, cache.distancePoint);
    const secondDistance = distanceAtSegmentT(start, delta, secondT, weaponBox.bounds, cache.distancePoint);
    if (firstDistance < secondDistance) high = secondT;
    else low = firstT;
  }
  const candidateT = (low + high) * 0.5;
  const candidateDistance = distanceAtSegmentT(start, delta, candidateT, weaponBox.bounds, cache.distancePoint);
  if (candidateDistance < bestDistance) {
    bestDistance = candidateDistance;
    bestT = candidateT;
  }
  cache.distanceSegmentT = bestT;
  return bestDistance * weaponBox.worldScale;
}

function distanceSegmentToWeaponGeometry(
  segment: ProxySegment,
  weaponBox: WeaponBox,
  cache: PoseCache,
): number {
  const boundsDistance = distanceSegmentToWeaponBounds(segment, weaponBox, cache);
  if (!weaponBox.position || weaponBox.triangleIndices.length < 3 || boundsDistance > segment.radius) {
    return boundsDistance;
  }

  const start = cache.distanceStart;
  const end = cache.distanceEnd;
  let bestDistance = Infinity;
  let bestT = 0;
  cache.bestTriangleA.set(0, 0, 0);
  cache.bestTriangleB.set(0, 0, 0);
  cache.bestTriangleC.set(0, 0, 0);
  for (let offset = 0; offset + 2 < weaponBox.triangleIndices.length; offset += 3) {
    const firstIndex = weaponBox.triangleIndices[offset];
    const secondIndex = weaponBox.triangleIndices[offset + 1];
    const thirdIndex = weaponBox.triangleIndices[offset + 2];
    cache.triangleA.fromBufferAttribute(weaponBox.position, firstIndex);
    cache.triangleB.fromBufferAttribute(weaponBox.position, secondIndex);
    cache.triangleC.fromBufferAttribute(weaponBox.position, thirdIndex);
    const distance = distanceSegmentToTriangle(
      start,
      end,
      cache.triangleA,
      cache.triangleB,
      cache.triangleC,
      cache,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestT = cache.triangleSegmentT;
      cache.bestTriangleA.copy(cache.triangleA);
      cache.bestTriangleB.copy(cache.triangleB);
      cache.bestTriangleC.copy(cache.triangleC);
      if (bestDistance <= 1e-8) break;
    }
  }

  if (bestDistance > segment.radius && weaponBox.closed) {
    const midpoint = cache.distancePoint.copy(start).add(end).multiplyScalar(0.5);
    if (pointInsideClosedWeaponComponent(start, weaponBox, cache)) {
      bestDistance = 0;
      bestT = 0;
    } else if (pointInsideClosedWeaponComponent(end, weaponBox, cache)) {
      bestDistance = 0;
      bestT = 1;
    } else if (pointInsideClosedWeaponComponent(midpoint, weaponBox, cache)) {
      bestDistance = 0;
      bestT = 0.5;
    }
  }

  cache.distanceSegmentT = bestT;
  return Number.isFinite(bestDistance) ? bestDistance * weaponBox.worldScale : boundsDistance;
}

function calculateClipping(
  character: THREE.Object3D,
  cache: PoseCache,
): {
  proxyComplete: boolean;
  weaponBody: boolean;
  weaponArm: boolean;
  handForearm: boolean;
  maxPenetration: number;
  elbowBendError: number;
} {
  const proxy = collectCharacterProxySegments(character);
  const segments = proxy.segments;
  const weaponBoxes = cache.weaponBoxes;
  refreshWeaponBoxes(weaponBoxes);
  let bodyDepth = 0;
  let armDepth = 0;
  let forearmDepth = 0;
  for (const weaponBox of weaponBoxes) {
    if (!weaponBox.node.visible) continue;
    for (const segment of segments) {
      const distance = distanceSegmentToWeaponGeometry(segment, weaponBox, cache);
      const penetration = segment.radius - distance;
      if (penetration <= 0 || (segment.kind === "forearm" && cache.distanceSegmentT > 0.75)) continue;
      if (segment.kind === "body") {
        if (!weaponBox.allowsTorsoContact) bodyDepth = Math.max(bodyDepth, penetration);
      } else if (segment.kind === "arm") armDepth = Math.max(armDepth, penetration);
      else forearmDepth = Math.max(forearmDepth, penetration);
    }
  }
  return {
    proxyComplete: proxy.complete,
    weaponBody: bodyDepth > VERIFIED_POSE_THRESHOLDS.maxBodyPenetration,
    weaponArm: armDepth > VERIFIED_POSE_THRESHOLDS.maxArmPenetration,
    handForearm: forearmDepth > VERIFIED_POSE_THRESHOLDS.maxArmPenetration,
    maxPenetration: Math.max(bodyDepth, armDepth, forearmDepth),
    elbowBendError: proxy.elbowBendError,
  };
}

function calculateDiagnostics(
  character: THREE.Object3D,
  weapon: THREE.Object3D,
  cache: PoseCache,
  diagnosticsEnabled: boolean,
): PoseDiagnostics {
  cache.worldSupport.copy(cache.anchors.support.point).applyMatrix4(weapon.matrixWorld);
  cache.worldPrimary.copy(cache.anchors.primary.point).applyMatrix4(weapon.matrixWorld);
  cache.worldMuzzle.copy(cache.anchors.muzzle.point).applyMatrix4(weapon.matrixWorld);
  cache.worldSourceAxis.copy(cache.sourceAxis).transformDirection(weapon.matrixWorld);
  cache.worldSourceUp.copy(cache.sourceUp).transformDirection(weapon.matrixWorld);
  if (cache.anchors.muzzle.direction) {
    cache.worldMuzzleDirection.copy(cache.sourceMuzzleDirection).transformDirection(weapon.matrixWorld);
  } else {
    cache.worldMuzzleDirection.subVectors(cache.worldMuzzle, cache.worldPrimary);
  }

  const primaryGripError = cache.worldPrimary.distanceTo(cache.rightHand);
  const supportGripError = cache.worldSupport.distanceTo(cache.leftHand);
  const gripSpanError = Math.abs(cache.leftHand.distanceTo(cache.rightHand) - cache.worldPrimary.distanceTo(cache.worldSupport));
  const gripOrientationError = Math.max(
    cache.worldSourceAxis.angleTo(cache.targetAxis),
    cache.worldSourceUp.angleTo(cache.targetUp),
  );
  const muzzleDirectionError = cache.worldMuzzleDirection.lengthSq() > 1e-8
    ? cache.worldMuzzleDirection.normalize().angleTo(cache.targetMuzzleDirection)
    : Infinity;
  const muzzleDirectionTrusted = cache.anchors.muzzle.source !== "procedural"
    || cache.anchors.muzzle.direction !== undefined;
  const shoulderAlignmentError = cache.targetForward.angleTo(cache.bodyForward);
  const clippingResult = diagnosticsEnabled
    ? calculateClipping(character, cache)
    : null;
  const elbowBendError = clippingResult?.elbowBendError
    ?? collectCharacterProxySegments(character).elbowBendError;

  const clipping = {
    checked: diagnosticsEnabled,
    proxyComplete: clippingResult?.proxyComplete ?? false,
    weaponBody: clippingResult?.weaponBody ?? false,
    weaponArm: clippingResult?.weaponArm ?? false,
    handForearm: clippingResult?.handForearm ?? false,
    maxPenetration: clippingResult?.maxPenetration ?? 0,
  };
  const stable = !cache.hasPreviousPose
    || (cache.previousPosition.distanceTo(weapon.position) < 0.35
      && cache.previousQuaternion.angleTo(weapon.quaternion) < 0.75);
  cache.previousPosition.copy(weapon.position);
  cache.previousQuaternion.copy(weapon.quaternion);
  cache.hasPreviousPose = true;

  const score = primaryGripError * 100 + supportGripError * 100
    + gripSpanError * 20 + gripOrientationError + muzzleDirectionError * 2 + elbowBendError
    + clipping.maxPenetration * 20;
  const verified = diagnosticsEnabled
    && stable
    && muzzleDirectionTrusted
    && primaryGripError <= VERIFIED_POSE_THRESHOLDS.gripPosition
    && supportGripError <= VERIFIED_POSE_THRESHOLDS.gripPosition
    && gripSpanError <= VERIFIED_POSE_THRESHOLDS.gripPosition
    && gripOrientationError <= VERIFIED_POSE_THRESHOLDS.gripOrientation
    && muzzleDirectionError <= VERIFIED_POSE_THRESHOLDS.muzzleAngle
    && elbowBendError <= VERIFIED_POSE_THRESHOLDS.elbowBendError
    && clipping.proxyComplete
    && !clipping.weaponBody
    && !clipping.weaponArm
    && !clipping.handForearm;
  const reason = !diagnosticsEnabled
    ? "diagnostics disabled"
    : !muzzleDirectionTrusted
      ? "missing trusted muzzle direction"
    : !clipping.proxyComplete
      ? "missing character proxy segments"
      : clipping.weaponBody
        ? "weapon body clipping"
        : clipping.weaponArm
          ? "weapon arm clipping"
          : clipping.handForearm
            ? "hand/forearm clipping"
            : !stable
              ? "unstable pose"
              : primaryGripError > VERIFIED_POSE_THRESHOLDS.gripPosition
                ? "primary grip misalignment"
                : supportGripError > VERIFIED_POSE_THRESHOLDS.gripPosition
                  ? "support grip misalignment"
                  : gripSpanError > VERIFIED_POSE_THRESHOLDS.gripPosition
                    ? "grip span mismatch"
                    : gripOrientationError > VERIFIED_POSE_THRESHOLDS.gripOrientation
                      ? "grip orientation mismatch"
                      : muzzleDirectionError > VERIFIED_POSE_THRESHOLDS.muzzleAngle
                        ? "muzzle direction mismatch"
                        : elbowBendError > VERIFIED_POSE_THRESHOLDS.elbowBendError
                          ? "implausible elbow bend"
                          : undefined;

  return {
    solved: true,
    verified,
    reason,
    weaponScale: cache.scale,
    primaryGripError,
    supportGripError,
    gripSpanError,
    gripOrientationError,
    muzzleDirectionError,
    muzzleDirectionTrusted,
    shoulderAlignmentError,
    elbowBendError,
    clipping,
    stable,
    score,
    socketSources: {
      primary: cache.anchors.primary.source,
      support: cache.anchors.support.source,
      muzzle: cache.anchors.muzzle.source,
      ads: cache.anchors.ads.source,
    },
    socketNodes: {
      primary: cache.anchors.primary.nodeName,
      support: cache.anchors.support.nodeName,
      muzzle: cache.anchors.muzzle.nodeName,
      ads: cache.anchors.ads.nodeName,
    },
  };
}

/** Solve a stable two-hand weapon pose from the current animated skeleton. */
export function solveVerifiedGripPose(
  character: THREE.Object3D,
  weapon: THREE.Object3D,
  options: PoseSolveOptions = {},
): PoseDiagnostics {
  const cache = getPoseCache(weapon);
  const weaponKey = getWeaponKey(options.weaponId);
  if (cache.initialized && cache.weaponKey !== weaponKey) {
    cache.initialized = false;
    cache.scale = 0;
    cache.hasPreviousPose = false;
  }
  if (cache.poseContext !== options.poseContext) {
    cache.poseContext = options.poseContext;
    cache.hasPreviousPose = false;
  }
  if (!applyPlayerHoldFrame(character, options.holdFrame)) return makeFailedDiagnostics("missing hold-frame IK bones");
  if (!copyCharacterHands(character, cache)) return makeFailedDiagnostics("missing hand bones");
  if (cache.leftHand.distanceTo(cache.rightHand) < VERIFIED_POSE_THRESHOLDS.handSpan) {
    return makeFailedDiagnostics("degenerate hand span");
  }

  if (weapon.parent !== character) character.add(weapon);
  character.updateMatrixWorld(true);
  weapon.updateMatrixWorld(true);
  const initializationError = refreshPoseCache(weapon, cache, options.weaponId);
  if (initializationError) return makeFailedDiagnostics(initializationError, cache.anchors);

  if (!buildTargetBasis(character, cache, options.forwardPitch ?? 0)) {
    return makeFailedDiagnostics("invalid target grip basis", cache.anchors);
  }

  const sourceSpan = cache.anchors.primary.point.distanceTo(cache.anchors.support.point);
  const targetSpan = cache.leftHand.distanceTo(cache.rightHand);
  if (!Number.isFinite(sourceSpan) || sourceSpan < 1e-8) return makeFailedDiagnostics("invalid weapon grip span", cache.anchors);
  cache.scale = clampScale(options.scale ?? targetSpan / sourceSpan);

  cache.rotatedSupport.copy(cache.anchors.support.point)
    .multiplyScalar(cache.scale)
    .applyQuaternion(cache.targetQuaternion);
  cache.targetWeaponPosition.copy(cache.leftHand).sub(cache.rotatedSupport);
  const parent = weapon.parent || character;
  cache.worldMatrix.compose(
    cache.targetWeaponPosition,
    cache.targetQuaternion,
    cache.scaleVector.setScalar(cache.scale),
  );
  cache.parentInverse.copy(parent.matrixWorld).invert();
  cache.localMatrix.multiplyMatrices(cache.parentInverse, cache.worldMatrix);
  cache.localMatrix.decompose(weapon.position, weapon.quaternion, weapon.scale);
  weapon.updateMatrixWorld(true);

  return calculateDiagnostics(character, weapon, cache, options.diagnostics !== false);
}

interface TransformSnapshot {
  parent: THREE.Object3D | null;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

function snapshotTransform(weapon: THREE.Object3D): TransformSnapshot {
  return {
    parent: weapon.parent,
    position: weapon.position.clone(),
    quaternion: weapon.quaternion.clone(),
    scale: weapon.scale.clone(),
  };
}

function restoreTransform(weapon: THREE.Object3D, snapshot: TransformSnapshot): void {
  if (weapon.parent !== snapshot.parent) {
    if (snapshot.parent) snapshot.parent.add(weapon);
    else weapon.removeFromParent();
  }
  weapon.position.copy(snapshot.position);
  weapon.quaternion.copy(snapshot.quaternion);
  weapon.scale.copy(snapshot.scale);
  weapon.updateMatrixWorld(true);
}

/** Evaluate deterministic candidates without letting one candidate contaminate another. */
export function chooseVerifiedGripPose(
  character: THREE.Object3D,
  weapon: THREE.Object3D,
  candidates: readonly PoseCandidate[] | undefined = undefined,
  options: Omit<PoseSolveOptions, "forwardPitch"> = {},
): PoseCandidateResult {
  const resolvedCandidates = candidates || (getWeaponKey(options.weaponId) === "sniper"
    ? SNIPER_POSE_CANDIDATES
    : VERIFIED_POSE_CANDIDATES);
  const selectedFallback = resolvedCandidates[0] || VERIFIED_POSE_CANDIDATES[0];
  if (!selectedFallback) return { selected: { id: "none", forwardPitch: 0 }, diagnostics: makeFailedDiagnostics("no pose candidates"), candidates: [] };

  const cache = getPoseCache(weapon);
  const baseline = snapshotTransform(weapon);
  const previousPosition = cache.previousPosition.clone();
  const previousQuaternion = cache.previousQuaternion.clone();
  const previousHasPose = cache.hasPreviousPose;
  let selected = selectedFallback;
  let selectedDiagnostics = makeFailedDiagnostics("no pose candidates");
  const results: Array<{ candidate: PoseCandidate; diagnostics: PoseDiagnostics }> = [];

  for (const candidate of resolvedCandidates) {
    restoreTransform(weapon, baseline);
    cache.previousPosition.copy(previousPosition);
    cache.previousQuaternion.copy(previousQuaternion);
    cache.hasPreviousPose = previousHasPose;
    const diagnostics = solveVerifiedGripPose(character, weapon, {
      ...options,
      forwardPitch: candidate.forwardPitch,
    });
    results.push({ candidate, diagnostics });
    const isBetter = diagnostics.verified !== selectedDiagnostics.verified
      ? diagnostics.verified
      : diagnostics.score < selectedDiagnostics.score
        || (diagnostics.score === selectedDiagnostics.score && candidate.id < selected.id);
    if (isBetter) {
      selected = candidate;
      selectedDiagnostics = diagnostics;
    }
  }

  restoreTransform(weapon, baseline);
  cache.previousPosition.copy(previousPosition);
  cache.previousQuaternion.copy(previousQuaternion);
  cache.hasPreviousPose = previousHasPose;
  selectedDiagnostics = solveVerifiedGripPose(character, weapon, {
    ...options,
    forwardPitch: selected.forwardPitch,
  });
  return { selected, diagnostics: selectedDiagnostics, candidates: results };
}
