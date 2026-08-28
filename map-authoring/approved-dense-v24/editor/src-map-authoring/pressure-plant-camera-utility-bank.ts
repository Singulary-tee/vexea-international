import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PressurePlantSliceDetail } from "./pressure-plant-slice-details";

type PressureMaterialFactory = (
  record: PressurePlantSliceDetail,
  colorOverride?: number,
  roughnessOverride?: number,
  metalnessOverride?: number,
) => THREE.MeshStandardMaterial;

/**
 * Player-scale utility bank mounted to the plant's west facade. The bank is a
 * presentation-only occupancy cue; it does not replace or move any existing
 * loading bay, shell, route, cover, or stair record.
 */
export function addPressurePlantCameraUtilityBank({
  root,
  record,
  pressureMaterial,
}: {
  root: THREE.Group;
  record: PressurePlantSliceDetail;
  pressureMaterial: PressureMaterialFactory;
}) {
  const group = new THREE.Group();
  group.name = "pressure_plant_camera_utility_bank";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = "image_plant_building_south_service_frame";
  group.userData.supportClass = "SUPPORTED";
  group.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    role: "camera_visible_grounded_west_facade_utility_bank",
    materialFamily: "PAINTED_STEEL",
    visualHostOffset: { x: -66.8, y: 0, z: 23 },
  };

  const wallX = 148.8;
  const zCenter = 88.4;
  const utilityY = 4.9;
  const dark = pressureMaterial(record, 0x263332, 0.88, 0.26);
  const casing = pressureMaterial(record, 0x59665e, 0.74, 0.52);
  const trim = pressureMaterial(record, 0x869087, 0.72, 0.66);
  const concrete = pressureMaterial(record, 0x858980, 0.95, 0.04);
  const safety = new THREE.MeshStandardMaterial({ color: 0xb77a3e, roughness: 0.78, metalness: 0.12 });
  const warm = new THREE.MeshStandardMaterial({ color: 0xffc080, emissive: 0x713a1e, emissiveIntensity: 0.7, roughness: 0.32, metalness: 0.05 });

  const add = (mesh: THREE.Mesh, role: string, materialFamily = "PAINTED_STEEL") => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.hostId = record.id;
    mesh.userData.hostSocket = "image_plant_building_south_service_frame";
    mesh.userData.supportClass = "SUPPORTED";
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

  const plinth = new THREE.Mesh(new RoundedBoxGeometry(11.2, 0.36, 5.2, 5, 0.08), concrete);
  plinth.position.set(wallX - 1.55, 0.18, zCenter);
  add(plinth, "camera_utility_bank_grounded_concrete_plinth", "CONCRETE");
  const curbLip = new THREE.Mesh(new RoundedBoxGeometry(9.8, 0.18, 0.36, 4, 0.04), trim);
  curbLip.position.set(wallX - 1.9, 0.48, zCenter - 2.12);
  add(curbLip, "camera_utility_bank_plinth_front_lip", "CONCRETE");

  const doorFrame = new THREE.Mesh(new RoundedBoxGeometry(0.34, 2.88, 1.6, 4, 0.05), trim);
  doorFrame.position.set(wallX - 0.42, utilityY, zCenter - 1.65);
  add(doorFrame, "camera_utility_bank_personnel_door_frame", "CONCRETE");
  const door = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.5, 1.22, 4, 0.035), dark);
  door.position.set(wallX - 0.62, utilityY, zCenter - 1.65);
  add(door, "camera_utility_bank_personnel_door");
  const doorHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 10), trim);
  doorHandle.rotation.z = Math.PI / 2;
  doorHandle.position.set(wallX - 0.78, utilityY, zCenter - 1.35);
  add(doorHandle, "camera_utility_bank_personnel_door_handle", "GALVANIZED_STEEL");
  const doorLight = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.18, 0.28, 3, 0.035), warm);
  doorLight.position.set(wallX - 0.55, utilityY + 1.72, zCenter - 1.65);
  add(doorLight, "camera_utility_bank_personnel_door_practical", "PAINTED_STEEL");

  for (const [index, z] of [zCenter - 0.2, zCenter + 1.3, zCenter + 2.8].entries()) {
    const cabinet = new THREE.Mesh(new RoundedBoxGeometry(0.34, 1.72, 1.02, 4, 0.055), casing);
    cabinet.position.set(wallX - 0.42, utilityY, z);
    add(cabinet, `camera_utility_bank_electrical_cabinet_${index + 1}`);
    const face = new THREE.Mesh(new RoundedBoxGeometry(0.07, 1.12, 0.7, 3, 0.02), trim);
    face.position.set(wallX - 0.62, utilityY, z);
    add(face, `camera_utility_bank_electrical_cabinet_${index + 1}_face`, "GALVANIZED_STEEL");
    const warningPanel = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.26, 0.58, 3, 0.02), safety);
    warningPanel.position.set(wallX - 0.68, utilityY + 0.28, z);
    add(warningPanel, `camera_utility_bank_electrical_cabinet_${index + 1}_warning`, "PAINTED_STEEL");
  }

  const canopy = new THREE.Mesh(new RoundedBoxGeometry(5.1, 0.22, 4.9, 4, 0.055), dark);
  canopy.position.set(wallX - 2.75, utilityY + 1.78, zCenter + 0.65);
  canopy.rotation.z = -0.025;
  add(canopy, "camera_utility_bank_small_weather_canopy", "GALVANIZED_STEEL");
  for (const z of [zCenter - 1.7, zCenter + 3.0]) {
    const canopyPost = new THREE.Mesh(new RoundedBoxGeometry(0.16, 1.55, 0.16, 3, 0.03), casing);
    canopyPost.position.set(wallX - 5.1, utilityY + 0.85, z);
    add(canopyPost, "camera_utility_bank_canopy_post", "GALVANIZED_STEEL");
  }

  for (let step = 0; step < 3; step += 1) {
    const tread = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.18, 1.2, 4, 0.04), concrete);
    tread.position.set(wallX - 1.25 - step * 0.55, 0.58 + step * 0.18, zCenter - 1.65);
    add(tread, `camera_utility_bank_personnel_door_step_${step + 1}`, "CONCRETE");
  }
  for (const z of [zCenter - 2.35, zCenter - 0.95]) {
    const railPost = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.85, 0.13, 3, 0.025), casing);
    railPost.position.set(wallX - 2.0, 0.95, z);
    add(railPost, "camera_utility_bank_personnel_door_rail_post", "GALVANIZED_STEEL");
  }
  const accessRail = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.13, 1.55, 3, 0.025), casing);
  accessRail.position.set(wallX - 2.0, 1.42, zCenter - 1.65);
  add(accessRail, "camera_utility_bank_personnel_door_access_rail", "GALVANIZED_STEEL");

  const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6.5, 12), trim);
  conduit.position.set(wallX - 0.78, utilityY + 2.65, zCenter + 1.9);
  add(conduit, "camera_utility_bank_vertical_conduit", "GALVANIZED_STEEL");
  const conduitTop = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 12), trim);
  conduitTop.rotation.z = Math.PI / 2;
  conduitTop.position.set(wallX - 2.5, utilityY + 5.85, zCenter + 1.9);
  add(conduitTop, "camera_utility_bank_upper_wall_conduit", "GALVANIZED_STEEL");
  const conduitBox = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.4, 0.7, 3, 0.03), casing);
  conduitBox.position.set(wallX - 2.1, utilityY + 5.85, zCenter + 1.9);
  add(conduitBox, "camera_utility_bank_upper_conduit_junction", "PAINTED_STEEL");

  root.add(group);
}
