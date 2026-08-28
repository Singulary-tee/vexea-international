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
 * A single player-scale industrial light tower placed on the visible service
 * route. This is presentation-only and does not replace the semantic light
 * record or alter the frozen route/cover geometry.
 */
export function addPressurePlantCameraLightTower({
  root,
  record,
  pressureMaterial,
}: {
  root: THREE.Group;
  record: PressurePlantSliceDetail;
  pressureMaterial: PressureMaterialFactory;
}) {
  const group = new THREE.Group();
  group.name = "pressure_plant_camera_service_light_tower";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = "pressure_yard_camera_service_light_base";
  group.userData.supportClass = "GROUNDED";
  group.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    role: "camera_visible_player_scale_service_light_tower",
    materialFamily: "PAINTED_STEEL",
    presentationOnly: true,
  };

  const mast = pressureMaterial(record, 0x43534f, 0.72, 0.68);
  const darkMast = pressureMaterial(record, 0x1e2b2b, 0.88, 0.46);
  const galvanized = pressureMaterial(record, 0x7c8881, 0.64, 0.76);
  const concrete = pressureMaterial(record, 0x757b73, 0.95, 0.03);
  const warm = new THREE.MeshStandardMaterial({
    color: 0xffbc73,
    emissive: 0x7c3617,
    emissiveIntensity: 1.5,
    roughness: 0.26,
    metalness: 0.06,
  });

  const add = (mesh: THREE.Mesh, role: string, materialFamily = "PAINTED_STEEL") => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.hostId = record.id;
    mesh.userData.hostSocket = "pressure_yard_camera_service_light_base";
    mesh.userData.supportClass = "GROUNDED";
    mesh.userData.authoringRecord = {
      type: "pressure-plant-detail",
      ...record,
      role,
      materialFamily,
      presentationOnly: true,
      hostSocket: "pressure_yard_camera_service_light_base",
    };
    group.add(mesh);
  };

  const baseX = 80;
  const baseZ = 76;
  const foot = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.16, 0.9, 4, 0.045), concrete);
  foot.position.set(baseX, 0.08, baseZ);
  add(foot, "camera_service_light_tower_grounded_concrete_foot", "CONCRETE");

  const mastGeometry = new THREE.CylinderGeometry(0.16, 0.24, 8.25, 14, 1, false);
  const verticalMast = new THREE.Mesh(mastGeometry, mast);
  verticalMast.position.set(baseX, 4.21, baseZ);
  add(verticalMast, "camera_service_light_tower_tapered_mast", "PAINTED_STEEL");

  for (const y of [1.45, 3.95, 6.45]) {
    const collar = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.12, 0.38, 3, 0.025), galvanized);
    collar.position.set(baseX, y, baseZ);
    add(collar, "camera_service_light_tower_mast_collar", "GALVANIZED_STEEL");
  }

  const serviceBox = new THREE.Mesh(new RoundedBoxGeometry(0.62, 1.1, 0.42, 4, 0.055), darkMast);
  serviceBox.position.set(baseX - 0.38, 0.72, baseZ + 0.02);
  add(serviceBox, "camera_service_light_tower_grounded_service_box", "PAINTED_STEEL");
  const serviceDoor = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.68, 0.28, 3, 0.02), galvanized);
  serviceDoor.position.set(baseX - 0.71, 0.72, baseZ + 0.02);
  add(serviceDoor, "camera_service_light_tower_service_box_door", "GALVANIZED_STEEL");

  const arm = new THREE.Mesh(new RoundedBoxGeometry(2.65, 0.16, 0.16, 4, 0.03), galvanized);
  arm.position.set(baseX + 1.06, 8.18, baseZ);
  add(arm, "camera_service_light_tower_cantilever_arm", "GALVANIZED_STEEL");
  const brace = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.1, 0.1, 3, 0.02), darkMast);
  brace.position.set(baseX + 0.48, 7.78, baseZ);
  brace.rotation.z = -0.55;
  add(brace, "camera_service_light_tower_cantilever_brace", "PAINTED_STEEL");

  const luminaireHousing = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.22, 0.38, 4, 0.06), darkMast);
  luminaireHousing.position.set(baseX + 2.18, 8.04, baseZ);
  luminaireHousing.rotation.z = -0.08;
  add(luminaireHousing, "camera_service_light_tower_luminaire_housing", "PAINTED_STEEL");
  const luminaire = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.08, 0.3, 3, 0.025), warm);
  luminaire.position.set(baseX + 2.18, 7.88, baseZ);
  add(luminaire, "camera_service_light_tower_warm_luminaire", "LIGHT_EMITTER");

  const point = new THREE.PointLight(0xffaa69, 9.5, 17.0, 2.0);
  point.position.set(baseX + 2.12, 7.78, baseZ);
  point.userData.pressurePlantSlice = true;
  point.userData.presentationOnly = true;
  point.userData.hostId = record.id;
  point.userData.hostSocket = "pressure_yard_camera_service_light_base";
  point.userData.supportClass = "SUPPORTED";
  point.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    role: "camera_service_light_tower_warm_practical",
    materialFamily: "LIGHT_EMITTER",
    presentationOnly: true,
  };
  group.add(point);

  root.add(group);
}
