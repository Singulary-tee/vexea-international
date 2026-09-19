import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PressurePlantSliceDetail } from "./pressure-plant-slice-details";

type PressureMaterialFactory = (
  record: PressurePlantSliceDetail,
  colorOverride?: number,
  roughnessOverride?: number,
  metalnessOverride?: number,
) => THREE.MeshStandardMaterial;

type AddTreeMesh = (mesh: THREE.Mesh, role: string, materialFamily?: string) => void;

export function addTreeRoutePlantingStrip({
  record,
  pressureMaterial,
  add,
}: {
  record: PressurePlantSliceDetail;
  pressureMaterial: PressureMaterialFactory;
  add: AddTreeMesh;
}) {
  const stripWidth = 48.0;
  const soilMaterial = pressureMaterial(record, 0x5e503e, 0.98, 0.01);
  const verge = new THREE.Mesh(new RoundedBoxGeometry(stripWidth, 0.16, 3.2, 4, 0.05), soilMaterial);
  verge.position.set(0, 0.225, 2.45);
  add(verge, "tree_route_edge_continuous_soil_verge", "SOIL_ROCK");

  const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0x9b9b91, roughness: 0.9, metalness: 0.03 });
  const sidewalk = new THREE.Mesh(new RoundedBoxGeometry(stripWidth, 0.18, 1.55, 4, 0.05), sidewalkMaterial);
  sidewalk.position.set(0, 0.24, -0.15);
  add(sidewalk, "tree_route_edge_camera_visible_concrete_sidewalk", "CONCRETE");
  for (const [index, jointX] of [-16.0, 0.0, 16.0].entries()) {
    const sidewalkJoint = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 1.38), pressureMaterial(record, 0x6c716b, 0.96, 0.02));
    sidewalkJoint.position.set(jointX, 0.35, -0.15);
    add(sidewalkJoint, `tree_route_edge_sidewalk_expansion_joint_${index + 1}`, "CONCRETE");
  }
  const vergeCurbMaterial = pressureMaterial(record, 0x9b998d, 0.84, 0.06);
  const vergeCurb = new THREE.Mesh(new RoundedBoxGeometry(stripWidth, 0.22, 0.22, 4, 0.04), vergeCurbMaterial);
  vergeCurb.position.set(0, 0.36, 0.73);
  add(vergeCurb, "tree_route_edge_planting_verge_curb", "CONCRETE");

  const vergeGrassMaterial = new THREE.MeshStandardMaterial({ color: 0x566546, roughness: 0.95, metalness: 0.0 });
  for (const [index, [x, z, height]] of ([
    [-14.2, 2.2, 0.42],
    [-9.6, 3.0, 0.34],
    [7.8, 2.8, 0.48],
    [12.8, 2.0, 0.38],
    [15.5, 3.1, 0.3],
  ] as const).entries()) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(height * 0.18, height, 5), vergeGrassMaterial);
    tuft.position.set(x, height / 2 + 0.305, z);
    tuft.rotation.z = index % 2 === 0 ? -0.14 : 0.11;
    add(tuft, "tree_route_edge_grass_tuft", "VEGETATION");
  }
}
