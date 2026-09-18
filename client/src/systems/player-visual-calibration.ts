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
