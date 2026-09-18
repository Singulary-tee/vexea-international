import * as THREE from "three/webgpu";
import { resolveGripAnchors } from "./weapons/pose-solver";
import type { WeaponId } from "../shared/weapons";
import {
  chooseBarrelDirection,
  directionAlignmentAngle,
  directionFromEndpoint,
  type Direction3,
} from "./pose-editor-composition";

export interface ProjectedBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minDepth: number;
  depth: number;
}

export interface BarrelDirectionMeasurement {
  direction: THREE.Vector3;
  start: THREE.Vector3;
  end: THREE.Vector3;
  source: "authored-endpoint" | "authored-axis" | "grip-to-muzzle" | "mesh-principal-axis";
  probeStart?: THREE.Vector3;
  probes?: BarrelGeometryProbe[];
}

export interface BarrelGeometryProbe {
  mesh: THREE.Object3D;
  indices: number[];
}

export interface BarrelMeasurement {
  authored: BarrelDirectionMeasurement;
  measurement: BarrelDirectionMeasurement;
  actual: BarrelDirectionMeasurement | null;
  authoredMeshAgreement: number;
}

export function disposeGeneratedPoseResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((child: any) => {
    if (child.userData.poseEditorOwnedGeometry && child.geometry) geometries.add(child.geometry);
    if (child.userData.poseEditorOwnedMaterial && child.material) {
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        materials.add(material);
      }
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

export interface FirstPersonHeadFilterStats {
  meshes: number;
  sourceTriangles: number;
  hiddenTriangles: number;
}

export function hideFirstPersonHead(root: THREE.Object3D): FirstPersonHeadFilterStats {
  const stats: FirstPersonHeadFilterStats = { meshes: 0, sourceTriangles: 0, hiddenTriangles: 0 };
  root.updateMatrixWorld(true);
  root.traverse((child: any) => {
    if (!child.isSkinnedMesh || !child.geometry || !child.skeleton) return;
    const headBones = new Set<number>();
    child.skeleton.bones.forEach((bone: THREE.Bone, index: number) => {
      if (/head/i.test(normalizedName(bone.name))) headBones.add(index);
    });
    const indexAttribute = child.geometry.getIndex();
    const skinIndex = child.geometry.getAttribute("skinIndex");
    const skinWeight = child.geometry.getAttribute("skinWeight");
    if (!headBones.size || !indexAttribute || !skinIndex || !skinWeight) return;

    const readHeadWeight = (vertexIndex: number): number => {
      let total = 0;
      for (let influence = 0; influence < 4; influence += 1) {
        if (headBones.has(skinIndex.getComponent(vertexIndex, influence))) {
          total += skinWeight.getComponent(vertexIndex, influence);
        }
      }
      return total;
    };
    const groups = child.geometry.groups.length > 0
      ? child.geometry.groups
      : [{ start: 0, count: indexAttribute.count, materialIndex: 0 }];
    const keptIndices: number[] = [];
    const keptGroupCounts: number[] = [];
    let hiddenTriangles = 0;
    for (const group of groups) {
      const groupEnd = Math.min(group.start + group.count, indexAttribute.count);
      let keptCount = 0;
      for (let offset = group.start; offset + 2 < groupEnd; offset += 3) {
        const vertices = [
          indexAttribute.getX(offset),
          indexAttribute.getX(offset + 1),
          indexAttribute.getX(offset + 2),
        ];
        const isHeadTriangle = vertices.every((vertexIndex) => readHeadWeight(vertexIndex) >= 0.5);
        if (isHeadTriangle) {
          hiddenTriangles += 1;
          continue;
        }
        keptIndices.push(...vertices);
        keptCount += 3;
      }
      keptGroupCounts.push(keptCount);
    }
    const sourceTriangles = Math.floor(indexAttribute.count / 3);
    stats.sourceTriangles += sourceTriangles;
    stats.hiddenTriangles += hiddenTriangles;
    if (hiddenTriangles === 0) return;

    const filteredGeometry = child.geometry.clone();
    filteredGeometry.setIndex(keptIndices);
    filteredGeometry.clearGroups();
    let groupStart = 0;
    groups.forEach((group, groupIndex) => {
      const count = keptGroupCounts[groupIndex];
      if (count > 0) filteredGeometry.addGroup(groupStart, count, group.materialIndex);
      groupStart += count;
    });
    filteredGeometry.computeBoundingBox();
    filteredGeometry.computeBoundingSphere();
    child.geometry = filteredGeometry;
    child.userData.poseEditorOwnedGeometry = true;
    stats.meshes += 1;
  });
  return stats;
}

/** Bake mesh positions for renderers that do not evaluate skin or quantized attributes. */
export function bakeSkinnedMeshesForSoftware(root: THREE.Object3D): number {
  const meshes: THREE.Mesh[] = [];
  root.updateMatrixWorld(true);
  root.traverse((child: any) => {
    if (child.isMesh && child.geometry?.getAttribute("position")
      && typeof child.getVertexPosition === "function") meshes.push(child);
  });
  const vertex = new THREE.Vector3();
  for (const mesh of meshes) {
    const source = mesh.geometry as THREE.BufferGeometry;
    const position = source.getAttribute("position");
    const bakedPositions = new Float32Array(position.count * 3);
    for (let index = 0; index < position.count; index += 1) {
      mesh.getVertexPosition(index, vertex);
      bakedPositions[index * 3] = vertex.x;
      bakedPositions[index * 3 + 1] = vertex.y;
      bakedPositions[index * 3 + 2] = vertex.z;
    }
    const geometry = source.clone();
    geometry.setAttribute("position", new THREE.BufferAttribute(bakedPositions, 3));
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const baked = new THREE.Mesh(geometry, mesh.material);
    baked.name = mesh.name;
    baked.matrixAutoUpdate = mesh.matrixAutoUpdate;
    baked.matrixWorldAutoUpdate = mesh.matrixWorldAutoUpdate;
    baked.matrix.copy(mesh.matrix);
    baked.position.copy(mesh.position);
    baked.quaternion.copy(mesh.quaternion);
    baked.scale.copy(mesh.scale);
    baked.visible = mesh.visible;
    baked.castShadow = mesh.castShadow;
    baked.receiveShadow = mesh.receiveShadow;
    baked.frustumCulled = mesh.frustumCulled;
    baked.renderOrder = mesh.renderOrder;
    baked.userData = {
      ...mesh.userData,
      poseEditorBakedSkin: true,
      poseEditorOwnedGeometry: true,
    };
    while (mesh.children.length > 0) baked.add(mesh.children[0]);

    const parent = mesh.parent;
    if (parent) {
      const index = parent.children.indexOf(mesh);
      parent.remove(mesh);
      parent.add(baked);
      parent.children.splice(parent.children.indexOf(baked), 1);
      parent.children.splice(index, 0, baked);
    }
    if (mesh.userData.poseEditorOwnedGeometry) source.dispose();
  }
  root.updateMatrixWorld(true);
  return meshes.length;
}

export function normalizedName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findNamed(root: THREE.Object3D, names: readonly string[]): THREE.Object3D | null {
  const wanted = names.map(normalizedName);
  let found: THREE.Object3D | null = null;
  root.traverse((child) => {
    if (!found && wanted.includes(normalizedName(child.name))) found = child;
  });
  return found;
}

export function findPlacementAnchor(root: THREE.Object3D, names: readonly string[]): THREE.Object3D {
  const authored = findNamed(root, names);
  if (authored) return authored;
  let firstVisibleMesh: THREE.Object3D | null = null;
  root.traverse((child: any) => {
    if (!firstVisibleMesh && child !== root && child.visible && child.isMesh) firstVisibleMesh = child;
  });
  return firstVisibleMesh || root;
}

export type PlacementAnchorMode = "node" | "visible-bounds-center";

export function placementAnchorPoint(
  anchor: THREE.Object3D,
  mode: PlacementAnchorMode = "node",
): THREE.Vector3 {
  if (mode === "visible-bounds-center" && (anchor as any).isMesh) {
    return visibleWorldBounds(anchor).getCenter(new THREE.Vector3());
  }
  return anchor.getWorldPosition(new THREE.Vector3());
}

export function boundsCorners(bounds: THREE.Box3): THREE.Vector3[] {
  const { min, max } = bounds;
  return [
    new THREE.Vector3(min.x, min.y, min.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, min.z),
    new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(max.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, max.z),
  ];
}

export function worldSpan(object: THREE.Object3D, axis: THREE.Vector3): number {
  const bounds = visibleWorldBounds(object);
  const corners = boundsCorners(bounds);
  let min = Infinity;
  let max = -Infinity;
  for (const corner of corners) {
    const value = corner.dot(axis);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return Number.isFinite(min) && Number.isFinite(max) ? max - min : 0;
}

export function visibleWorldBounds(object: THREE.Object3D): THREE.Box3 {
  const bounds = new THREE.Box3();
  object.updateWorldMatrix(true, true);
  object.traverseVisible((child: any) => {
    if (!child.geometry) return;
    const visibleVertexIndices = child.userData.poseEditorVisibleIndices as number[] | undefined;
    if (visibleVertexIndices && typeof child.getVertexPosition === "function") {
      const vertex = new THREE.Vector3();
      for (const vertexIndex of visibleVertexIndices) {
        child.getVertexPosition(vertexIndex, vertex);
        bounds.expandByPoint(vertex.clone().applyMatrix4(child.matrixWorld));
      }
      return;
    }
    bounds.union(new THREE.Box3().setFromObject(child));
  });
  return bounds;
}

export function cameraBasis(camera: THREE.PerspectiveCamera): {
  right: THREE.Vector3;
  up: THREE.Vector3;
  forward: THREE.Vector3;
} {
  return {
    right: new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize(),
    up: new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize(),
    forward: new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize(),
  };
}

export function alignPoseFrame(
  sourceForward: THREE.Vector3,
  sourceUp: THREE.Vector3,
  targetForward: THREE.Vector3,
  targetUp: THREE.Vector3,
): THREE.Quaternion | null {
  const normalizeFrame = (forward: THREE.Vector3, up: THREE.Vector3): THREE.Matrix4 | null => {
    const z = forward.clone();
    if (z.lengthSq() < 1e-8 || !Number.isFinite(z.lengthSq())) return null;
    z.normalize();
    const y = up.clone().addScaledVector(z, -up.dot(z));
    if (y.lengthSq() < 1e-8 || !Number.isFinite(y.lengthSq())) return null;
    y.normalize();
    const x = y.clone().cross(z).normalize();
    return new THREE.Matrix4().makeBasis(x, y, z);
  };
  const sourceBasis = normalizeFrame(sourceForward, sourceUp);
  const targetBasis = normalizeFrame(targetForward, targetUp);
  if (!sourceBasis || !targetBasis) return null;
  return new THREE.Quaternion().setFromRotationMatrix(
    targetBasis.multiply(sourceBasis.invert()),
  );
}

export function alignPoseDirection(
  sourceForward: THREE.Vector3,
  targetForward: THREE.Vector3,
): THREE.Quaternion | null {
  const sourceLength = sourceForward.length();
  const targetLength = targetForward.length();
  if (!Number.isFinite(sourceLength) || !Number.isFinite(targetLength) || sourceLength < 1e-8 || targetLength < 1e-8) {
    return null;
  }
  return new THREE.Quaternion().setFromUnitVectors(
    sourceForward.clone().normalize(),
    targetForward.clone().normalize(),
  );
}

export function projectedBounds(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  visibleDepthOnly = false,
): ProjectedBounds | null {
  if (visibleDepthOnly) {
    const { forward } = cameraBasis(camera);
    const vertex = new THREE.Vector3();
    const worldVertex = new THREE.Vector3();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minDepth = Infinity;
    let depthTotal = 0;
    let depthCount = 0;
    object.updateWorldMatrix(true, true);
    object.traverseVisible((child: any) => {
      const position = child.geometry?.getAttribute?.("position");
      if (!position) return;
      for (let index = 0; index < position.count; index += 1) {
        if (typeof child.getVertexPosition === "function") child.getVertexPosition(index, vertex);
        else vertex.fromBufferAttribute(position, index);
        worldVertex.copy(vertex).applyMatrix4(child.matrixWorld);
        const depth = worldVertex.clone().sub(camera.position).dot(forward);
        if (depth <= Math.max(camera.near, 1e-4)) continue;
        const projected = worldVertex.project(camera);
        if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) continue;
        minX = Math.min(minX, projected.x);
        maxX = Math.max(maxX, projected.x);
        minY = Math.min(minY, projected.y);
        maxY = Math.max(maxY, projected.y);
        minDepth = Math.min(minDepth, depth);
        depthTotal += depth;
        depthCount += 1;
      }
    });
    if (depthCount > 0) {
      return { minX, maxX, minY, maxY, minDepth, depth: depthTotal / depthCount };
    }
  }
  const bounds = visibleWorldBounds(object);
  if (bounds.isEmpty()) return null;
  const { forward } = cameraBasis(camera);
  const corners = boundsCorners(bounds);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minDepth = Infinity;
  let depthTotal = 0;
  let depthCount = 0;
  for (const corner of corners) {
    const depth = corner.clone().sub(camera.position).dot(forward);
    if (!visibleDepthOnly) minDepth = Math.min(minDepth, depth);
    if (depth <= Math.max(camera.near, 1e-4)) continue;
    if (visibleDepthOnly) minDepth = Math.min(minDepth, depth);
    const projected = corner.clone().project(camera);
    if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) continue;
    minX = Math.min(minX, projected.x);
    maxX = Math.max(maxX, projected.x);
    minY = Math.min(minY, projected.y);
    maxY = Math.max(maxY, projected.y);
    depthTotal += depth;
    depthCount += 1;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || depthCount === 0) return null;
  return { minX, maxX, minY, maxY, minDepth, depth: depthTotal / depthCount };
}

export function asDirection3(value: THREE.Vector3): Direction3 {
  return { x: value.x, y: value.y, z: value.z };
}

export function findMuzzleEndpoint(item: THREE.Object3D, muzzleNode: THREE.Object3D): THREE.Object3D | null {
  const childEndpoint = muzzleNode.children.find((child) => /end/i.test(child.name));
  return childEndpoint || findNamed(item, [
    `${muzzleNode.name}_end`,
    "tag_muzzle_end_0420",
    "MuzzleEnd",
    "muzzle_end",
    "barrel_end",
  ]);
}

export function resolveBarrelDirection(
  item: THREE.Object3D,
  itemId: WeaponId,
  anchors = resolveGripAnchors(item, itemId),
): BarrelDirectionMeasurement {
  const muzzleNode = anchors.muzzle.nodeName ? item.getObjectByName(anchors.muzzle.nodeName) : null;
  if (muzzleNode) {
    const muzzle = muzzleNode.getWorldPosition(new THREE.Vector3());
    let barrelNode = muzzleNode.parent;
    while (barrelNode && barrelNode !== item && !/barrel/i.test(barrelNode.name)) {
      barrelNode = barrelNode.parent;
    }
    const probeStart = barrelNode && barrelNode !== item
      ? barrelNode.getWorldPosition(new THREE.Vector3())
      : undefined;
    const endpointNode = findMuzzleEndpoint(item, muzzleNode);
    if (endpointNode) {
      const endpoint = endpointNode.getWorldPosition(new THREE.Vector3());
      const plan = directionFromEndpoint(asDirection3(muzzle), asDirection3(endpoint));
      if (plan) {
        return {
          direction: new THREE.Vector3(plan.direction.x, plan.direction.y, plan.direction.z),
          start: endpoint,
          end: muzzle,
          source: "authored-endpoint",
          probeStart,
        };
      }
    }
    if (anchors.muzzle.direction) {
      const direction = anchors.muzzle.direction.clone().transformDirection(item.matrixWorld).normalize();
      return {
        direction,
        start: muzzle,
        end: muzzle.clone().addScaledVector(direction, 0.25),
        source: "authored-axis",
        probeStart,
      };
    }
  }

  const primary = anchors.primary.point.clone().applyMatrix4(item.matrixWorld);
  const muzzle = anchors.muzzle.point.clone().applyMatrix4(item.matrixWorld);
  const direction = muzzle.sub(primary);
  if (direction.lengthSq() < 1e-8) direction.set(0, 0, 1);
  else direction.normalize();
  return {
    direction,
    start: primary,
    end: anchors.muzzle.point.clone().applyMatrix4(item.matrixWorld),
    source: "grip-to-muzzle",
  };
}

export function measureMeshLongitudinalAxis(
  item: THREE.Object3D,
  muzzle: THREE.Vector3,
  expectedDirection: THREE.Vector3,
  probeStart?: THREE.Vector3,
): BarrelDirectionMeasurement | null {
  item.updateMatrixWorld(true);
  const hint = expectedDirection.clone();
  if (!Number.isFinite(hint.lengthSq()) || hint.lengthSq() < 1e-8) return null;
  hint.normalize();

  const modelBounds = new THREE.Box3().setFromObject(item);
  if (modelBounds.isEmpty()) return null;
  const modelSize = modelBounds.getSize(new THREE.Vector3());
  const modelLength = Math.max(modelSize.x, modelSize.y, modelSize.z);
  const authoredProbeLength = probeStart
    ? probeStart.clone().sub(muzzle).dot(hint)
    : 0;
  const hasAuthoredProbe = Number.isFinite(authoredProbeLength) && authoredProbeLength < -1e-4;
  const windowStart = hasAuthoredProbe ? authoredProbeLength : -modelLength * 0.75;
  const windowEnd = hasAuthoredProbe ? Math.max(0.02, Math.abs(authoredProbeLength) * 0.02) : modelLength * 0.12;
  const lateralRadius = Math.max(modelLength * 0.09, 0.02);
  const isBarrelRegion = (point: THREE.Vector3): boolean => {
    const fromMuzzle = point.clone().sub(muzzle);
    const projection = fromMuzzle.dot(hint);
    if (projection < windowStart || projection > windowEnd) return false;
    if (hasAuthoredProbe) return true;
    return fromMuzzle.addScaledVector(hint, -projection).lengthSq() <= lateralRadius * lateralRadius;
  };

  interface AxisCandidate {
    axis: THREE.Vector3;
    center: THREE.Vector3;
    variance: number;
    span: number;
    score: number;
    probes: BarrelGeometryProbe[];
  }

  let best: AxisCandidate | null = null;
  item.traverse((child: any) => {
    if (!child.isMesh || !child.visible || !child.geometry?.getAttribute || typeof child.getVertexPosition !== "function") return;
    const positions = child.geometry.getAttribute("position");
    if (!positions || positions.count < 16) return;

    const vertex = new THREE.Vector3();
    const center = new THREE.Vector3();
    const selectedIndices: number[] = [];
    let selectedCount = 0;
    for (let index = 0; index < positions.count; index += 1) {
      child.getVertexPosition(index, vertex);
      vertex.applyMatrix4(child.matrixWorld);
      if (!isBarrelRegion(vertex)) continue;
      center.add(vertex);
      selectedIndices.push(index);
      selectedCount += 1;
    }
    if (selectedCount < 16) return;
    center.multiplyScalar(1 / selectedCount);

    let xx = 0;
    let xy = 0;
    let xz = 0;
    let yy = 0;
    let yz = 0;
    let zz = 0;
    for (let index = 0; index < positions.count; index += 1) {
      child.getVertexPosition(index, vertex);
      vertex.applyMatrix4(child.matrixWorld);
      if (!isBarrelRegion(vertex)) continue;
      vertex.sub(center);
      xx += vertex.x * vertex.x;
      xy += vertex.x * vertex.y;
      xz += vertex.x * vertex.z;
      yy += vertex.y * vertex.y;
      yz += vertex.y * vertex.z;
      zz += vertex.z * vertex.z;
    }
    const inverseCount = 1 / selectedCount;
    xx *= inverseCount;
    xy *= inverseCount;
    xz *= inverseCount;
    yy *= inverseCount;
    yz *= inverseCount;
    zz *= inverseCount;
    const applyCovariance = (axis: THREE.Vector3): THREE.Vector3 => new THREE.Vector3(
      xx * axis.x + xy * axis.y + xz * axis.z,
      xy * axis.x + yy * axis.y + yz * axis.z,
      xz * axis.x + yz * axis.y + zz * axis.z,
    );
    let axis = hint.clone();
    let variance = -Infinity;
    for (const seed of [hint, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]) {
      const candidate = seed.clone();
      for (let iteration = 0; iteration < 16; iteration += 1) {
        const transformed = applyCovariance(candidate);
        if (transformed.lengthSq() < 1e-12) break;
        candidate.copy(transformed.normalize());
      }
      const candidateVariance = candidate.dot(applyCovariance(candidate));
      if (candidateVariance > variance) {
        axis = candidate;
        variance = candidateVariance;
      }
    }
    const trace = xx + yy + zz;
    if (!Number.isFinite(variance) || variance <= 1e-8 || trace <= 1e-8 || variance / trace < 0.45) return;
    if (axis.dot(muzzle.clone().sub(center)) < 0) axis.negate();

    let minProjection = Infinity;
    let maxProjection = -Infinity;
    for (let index = 0; index < positions.count; index += 1) {
      child.getVertexPosition(index, vertex);
      vertex.applyMatrix4(child.matrixWorld);
      if (!isBarrelRegion(vertex)) continue;
      const projection = vertex.clone().sub(center).dot(axis);
      minProjection = Math.min(minProjection, projection);
      maxProjection = Math.max(maxProjection, projection);
    }
    const span = maxProjection - minProjection;
    const minimumSpan = hasAuthoredProbe
      ? Math.max(Math.abs(authoredProbeLength) * 0.5, 1e-4)
      : modelLength * 0.12;
    if (!Number.isFinite(span) || span < minimumSpan) return;
    const score = span * variance * Math.log1p(selectedCount);
    if (!best || score > best.score) {
      best = {
        axis,
        center,
        variance,
        span,
        score,
        probes: [{ mesh: child, indices: selectedIndices }],
      };
    }
  });
  if (!best) return null;

  return {
    direction: best.axis,
    start: best.center.clone().addScaledVector(best.axis, -best.span / 2),
    end: best.center.clone().addScaledVector(best.axis, best.span / 2),
    source: "mesh-principal-axis",
    probes: best.probes,
  };
}

export function measureProbedBarrelAxis(
  measurement: BarrelDirectionMeasurement,
  muzzle: THREE.Vector3,
): BarrelDirectionMeasurement | null {
  if (!measurement.probes?.length) return null;
  const points: THREE.Vector3[] = [];
  const vertex = new THREE.Vector3();
  for (const probe of measurement.probes) {
    const getVertexPosition = (probe.mesh as any).getVertexPosition;
    if (typeof getVertexPosition !== "function") continue;
    for (const index of probe.indices) {
      getVertexPosition.call(probe.mesh, index, vertex);
      points.push(vertex.clone().applyMatrix4(probe.mesh.matrixWorld));
    }
  }
  if (points.length < 16) return null;

  const center = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length);
  let xx = 0;
  let xy = 0;
  let xz = 0;
  let yy = 0;
  let yz = 0;
  let zz = 0;
  for (const point of points) {
    const relative = point.clone().sub(center);
    xx += relative.x * relative.x;
    xy += relative.x * relative.y;
    xz += relative.x * relative.z;
    yy += relative.y * relative.y;
    yz += relative.y * relative.z;
    zz += relative.z * relative.z;
  }
  const inverseCount = 1 / points.length;
  xx *= inverseCount;
  xy *= inverseCount;
  xz *= inverseCount;
  yy *= inverseCount;
  yz *= inverseCount;
  zz *= inverseCount;
  const covariance = (axis: THREE.Vector3): THREE.Vector3 => new THREE.Vector3(
    xx * axis.x + xy * axis.y + xz * axis.z,
    xy * axis.x + yy * axis.y + yz * axis.z,
    xz * axis.x + yz * axis.y + zz * axis.z,
  );
  let axis = new THREE.Vector3(1, 0, 0);
  let variance = -Infinity;
  for (const seed of [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ]) {
    const candidate = seed.clone();
    for (let iteration = 0; iteration < 16; iteration += 1) {
      const transformed = covariance(candidate);
      if (transformed.lengthSq() < 1e-12) break;
      candidate.copy(transformed.normalize());
    }
    const candidateVariance = candidate.dot(covariance(candidate));
    if (candidateVariance > variance) {
      axis = candidate;
      variance = candidateVariance;
    }
  }
  if (!Number.isFinite(variance) || variance <= 1e-8) return null;
  if (axis.dot(muzzle.clone().sub(center)) < 0) axis.negate();
  let minProjection = Infinity;
  let maxProjection = -Infinity;
  for (const point of points) {
    const projection = point.clone().sub(center).dot(axis);
    minProjection = Math.min(minProjection, projection);
    maxProjection = Math.max(maxProjection, projection);
  }
  const span = maxProjection - minProjection;
  if (!Number.isFinite(span) || span < 1e-4) return null;
  return {
    direction: axis,
    start: center.clone().addScaledVector(axis, -span / 2),
    end: center.clone().addScaledVector(axis, span / 2),
    source: "mesh-principal-axis",
  };
}

export function prepareBarrelMeasurement(item: THREE.Object3D, itemId: WeaponId): BarrelMeasurement {
  const authored = resolveBarrelDirection(item, itemId);
  const measured = measureMeshLongitudinalAxis(item, authored.end, authored.direction, authored.probeStart);
  const choice = chooseBarrelDirection(
    asDirection3(authored.direction),
    measured ? asDirection3(measured.direction) : { x: 0, y: 0, z: 0 },
  );
  const authoredSource = authored.source === "authored-endpoint" || authored.source === "authored-axis";
  const useMeasuredDirection = Boolean(measured && !authoredSource && choice.source === "measured");
  const direction = useMeasuredDirection ? choice.direction : asDirection3(authored.direction);
  const measurement = {
    ...(useMeasuredDirection && measured ? measured : authored),
    direction: new THREE.Vector3(direction.x, direction.y, direction.z),
    probes: measured?.probes,
  };
  return {
    authored,
    measurement,
    actual: null,
    authoredMeshAgreement: measured
      ? directionAlignmentAngle(asDirection3(authored.direction), asDirection3(measured.direction))
      : 0,
  };
}

export function currentMuzzlePoint(item: THREE.Object3D, itemId: WeaponId): THREE.Vector3 {
  const anchors = resolveGripAnchors(item, itemId);
  return anchors.muzzle.point.clone().applyMatrix4(item.matrixWorld);
}
