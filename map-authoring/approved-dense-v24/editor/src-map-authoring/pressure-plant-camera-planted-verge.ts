import * as THREE from "three";
import type { PressurePlantSliceDetail } from "./pressure-plant-slice-details";

type PressureMaterialFactory = (
  record: PressurePlantSliceDetail,
  colorOverride?: number,
  roughnessOverride?: number,
  metalnessOverride?: number,
) => THREE.MeshStandardMaterial;

/**
 * Continuous planted verge between the bounded fence and the segmented
 * sidewalk. The bed is presentation-only: it clarifies material transitions
 * and route edge but never becomes cover, navigation, or deployment truth.
 */
export function addPressurePlantCameraPlantedVerge({
  root,
  record,
  pressureMaterial,
  surfaceTexture,
}: {
  root: THREE.Group;
  record: PressurePlantSliceDetail;
  pressureMaterial: PressureMaterialFactory;
  surfaceTexture?: THREE.Texture;
}) {
  const group = new THREE.Group();
  group.name = "pressure_plant_camera_planted_verge";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = "pressure_yard_west_planting_edge";
  group.userData.supportClass = "GROUNDED";
  group.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    role: "camera_visible_continuous_planted_verge_between_fence_and_sidewalk",
    materialFamily: "SOIL_ROCK",
  };

  const soil = pressureMaterial(record, 0x4f493c, 0.98, 0.01).clone();
  if (surfaceTexture) {
    const map = surfaceTexture.clone();
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(5.5, 1.3);
    map.offset.set(0.18, 0.46);
    map.needsUpdate = true;
    soil.map = map;
    soil.bumpMap = map.clone();
    soil.bumpMap.wrapS = THREE.RepeatWrapping;
    soil.bumpMap.wrapT = THREE.RepeatWrapping;
    soil.bumpMap.repeat.copy(map.repeat);
    soil.bumpMap.offset.copy(map.offset);
    soil.bumpScale = 0.07;
    soil.needsUpdate = true;
  }
  const soilEdge = pressureMaterial(record, 0x6f6857, 0.94, 0.03);
  const concrete = pressureMaterial(record, 0x87887e, 0.95, 0.04);
  const steel = pressureMaterial(record, 0x505b55, 0.78, 0.54);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x687449, roughness: 0.96, metalness: 0.0 });
  const dryLeaf = new THREE.MeshStandardMaterial({ color: 0x8a7447, roughness: 0.98, metalness: 0.0 });

  const add = (mesh: THREE.Mesh, role: string, materialFamily = "SOIL_ROCK") => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.hostId = record.id;
    mesh.userData.hostSocket = "pressure_yard_west_planting_edge";
    mesh.userData.supportClass = "GROUNDED";
    mesh.userData.authoringRecord = {
      type: "pressure-plant-detail",
      ...record,
      role,
      materialFamily,
      presentationOnly: true,
    };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  const beds = [
    { x: 51, width: 27, depth: 3.6, skew: 0.5 },
    { x: 88, width: 31, depth: 3.8, skew: -0.4 },
    { x: 126, width: 34, depth: 3.4, skew: 0.65 },
  ];
  for (const [index, bed] of beds.entries()) {
    const shape = new THREE.Shape();
    const left = -bed.width / 2;
    const right = bed.width / 2;
    shape.moveTo(left, -bed.depth / 2);
    shape.lineTo(right - bed.skew, -bed.depth / 2 - 0.16);
    shape.lineTo(right, bed.depth / 2 - 0.1);
    shape.lineTo(left + bed.skew, bed.depth / 2 + 0.14);
    shape.closePath();
    const bedMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.11, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.07, bevelThickness: 0.035, curveSegments: 2 }), soil);
    bedMesh.rotation.x = -Math.PI / 2;
    bedMesh.position.set(bed.x, 0.035, 70.7);
    add(bedMesh, `camera_planted_verge_soil_bed_${index + 1}`);

    const farEdge = new THREE.Mesh(new THREE.BoxGeometry(bed.width - 1.0, 0.18, 0.16), soilEdge);
    farEdge.position.set(bed.x, 0.14, 68.7);
    farEdge.rotation.y = bed.skew * 0.012;
    add(farEdge, `camera_planted_verge_soil_bed_${index + 1}_far_edge`, "SOIL_ROCK");
    const sidewalkEdge = new THREE.Mesh(new THREE.BoxGeometry(bed.width - 0.8, 0.12, 0.18), concrete);
    sidewalkEdge.position.set(bed.x, 0.22, 72.52);
    sidewalkEdge.rotation.y = bed.skew * 0.012;
    add(sidewalkEdge, `camera_planted_verge_soil_bed_${index + 1}_sidewalk_edge`, "CONCRETE");
  }

  for (const [index, x] of [42, 75, 111, 145].entries()) {
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.105, 0.72, 14), steel);
    bollard.position.set(x, 0.36, 69.15);
    add(bollard, `camera_planted_verge_boundary_bollard_${index + 1}`, "PAINTED_STEEL");
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.032, 6, 16), steel);
    collar.position.set(x, 0.58, 69.15);
    add(collar, `camera_planted_verge_boundary_bollard_${index + 1}_collar`, "PAINTED_STEEL");
  }

  for (const [index, x] of [47, 67, 103, 120, 143].entries()) {
    const tuft = new THREE.Group();
    tuft.name = `camera_planted_verge_sparse_tuft_${index + 1}`;
    tuft.position.set(x, 0.1, 71.15 + (index % 2 === 0 ? 0.18 : -0.16));
    for (let blade = 0; blade < 7; blade += 1) {
      const bladeMesh = new THREE.Mesh(new THREE.ConeGeometry(0.035 + (blade % 3) * 0.012, 0.42 + (blade % 2) * 0.22, 5), blade % 3 === 0 ? dryLeaf : leaf);
      bladeMesh.position.set((blade - 3) * 0.055, 0.2 + (blade % 2) * 0.03, ((blade * 3) % 5 - 2) * 0.045);
      bladeMesh.rotation.z = (blade - 3) * 0.13;
      bladeMesh.userData.pressurePlantSlice = true;
      bladeMesh.userData.pressurePlantDetailId = record.id;
      bladeMesh.userData.presentationOnly = true;
      bladeMesh.userData.hostId = record.id;
      bladeMesh.userData.hostSocket = "pressure_yard_west_planting_edge";
      bladeMesh.userData.supportClass = "GROUNDED";
      bladeMesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_planted_verge_sparse_native_tuft", materialFamily: "VEGETATION", presentationOnly: true };
      bladeMesh.castShadow = true;
      bladeMesh.receiveShadow = true;
      tuft.add(bladeMesh);
    }
    group.add(tuft);
  }

  root.add(group);
}
