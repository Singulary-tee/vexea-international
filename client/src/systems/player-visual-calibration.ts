import * as THREE from "three/webgpu";
import { PLAYER_TOTAL_HEIGHT } from "../../../shared/constants";

export const PLAYER_BODY_FORWARD = { x: 0, y: 0, z: 1 } as const;
export const PLAYER_EYE_FORWARD_OFFSET = 0.12 * PLAYER_BODY_FORWARD.z;

/** Normalize the imported player visual to the gameplay capsule and feet origin. */
export function normalizeGameplayPlayerModel(model: THREE.Object3D): number {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const height = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(height) || height <= 0) return 1;

  const scale = PLAYER_TOTAL_HEIGHT / height;
  model.scale.multiplyScalar(scale);
  model.position.y -= bounds.min.y * scale;
  model.updateMatrixWorld(true);
  return scale;
}

export function disposeGeneratedPoseResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((child: any) => {
    if (child.userData?.poseEditorOwnedGeometry && child.geometry) geometries.add(child.geometry);
    if (child.userData?.poseEditorOwnedMaterial && child.material) {
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

export function normalizedName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isHeadObjectName(name: string): boolean {
  const value = normalizedName(name);
  return value === "head"
    || value.endsWith("head")
    || value.includes("headmesh")
    || value.includes("helmet")
    || value.includes("hair")
    || value.includes("face");
}

export function hideFirstPersonHead(root: THREE.Object3D): FirstPersonHeadFilterStats {
  const stats: FirstPersonHeadFilterStats = { meshes: 0, sourceTriangles: 0, hiddenTriangles: 0 };
  root.updateMatrixWorld(true);
  const headObjects = new Set<THREE.Object3D>();
  root.traverse((child: any) => {
    if (child.isBone && isHeadObjectName(child.name)) headObjects.add(child);
  });

  const isHeadMesh = (mesh: THREE.Object3D): boolean => {
    if (isHeadObjectName(mesh.name)) return true;
    let parent = mesh.parent;
    while (parent && parent !== root) {
      if (headObjects.has(parent)) return true;
      parent = parent.parent;
    }
    return false;
  };

  root.traverse((child: any) => {
    if (child.isMesh && isHeadMesh(child)) child.visible = false;
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
