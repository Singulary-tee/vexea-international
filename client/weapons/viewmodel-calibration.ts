import * as THREE from 'three';

export type ViewModelQuaternion = readonly [number, number, number, number];

export interface ViewModelCalibration {
  readonly viewModelQuaternion?: ViewModelQuaternion;
  readonly visualScale: number;
}

/**
 * Apply the source-to-viewmodel calibration exactly once after GLTF load.
 *
 * The weapon remains an intact hierarchy: this changes only the imported
 * scene root transform, never individual meshes, bones, or animation tracks.
 * Per-frame camera motion belongs to weaponsContainer in weapons_model.ts.
 */
export function applyViewModelCalibration(
  scene: THREE.Object3D,
  calibration: ViewModelCalibration,
): void {
  const q = calibration.viewModelQuaternion;
  if (q) {
    scene.quaternion.set(q[0], q[1], q[2], q[3]);
  }

  scene.scale.setScalar(calibration.visualScale);
}
