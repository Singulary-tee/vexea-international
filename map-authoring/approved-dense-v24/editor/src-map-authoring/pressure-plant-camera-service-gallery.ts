import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PressurePlantSliceDetail } from "./pressure-plant-slice-details";

type PressureMaterialFactory = (
  record: PressurePlantSliceDetail,
  colorOverride?: number,
  roughnessOverride?: number,
  metalnessOverride?: number,
) => THREE.MeshStandardMaterial;

type AddPressureObject = (object: THREE.Object3D, role: string, materialFamily?: string) => void;

/**
 * Camera-projected service gallery attached to the west face of the low shed.
 * This is presentation-only: the semantic shed footprint and all frozen route
 * and cover records remain unchanged. Every suspended run has explicit wall
 * brackets, grounded support plates, and an endpoint/riser so it cannot read as
 * floating decoration in the locked player frame.
 */
export function addPressurePlantCameraServiceGallery({
  root,
  record,
  pressureMaterial,
}: {
  root: THREE.Group;
  record: PressurePlantSliceDetail;
  pressureMaterial: PressureMaterialFactory;
}) {
  const group = new THREE.Group();
  group.name = "pressure_plant_camera_service_gallery";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = "low_shed_west_service_wall_pipe_endpoint";
  group.userData.supportClass = "SUPPORTED";
  group.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    role: "camera_visible_supported_low_shed_service_gallery",
    materialFamily: "GALVANIZED_STEEL",
    visualHostOffset: { x: -28, y: 0, z: 14 },
  };

  const steel = pressureMaterial(record, 0x344442, 0.62, 0.68);
  const darkSteel = pressureMaterial(record, 0x1e2b2b, 0.82, 0.46);
  const pipeMetal = pressureMaterial(record, 0x68746d, 0.54, 0.76);
  const concrete = pressureMaterial(record, 0x7e827a, 0.95, 0.05);
  const warning = new THREE.MeshStandardMaterial({ color: 0xb7793e, roughness: 0.76, metalness: 0.16 });
  const warm = new THREE.MeshStandardMaterial({ color: 0xffbf79, emissive: 0x73391c, emissiveIntensity: 0.68, roughness: 0.3, metalness: 0.08 });

  const galleryX = 80.8;
  const galleryZMin = 53.8;
  const galleryZMax = 65.8;
  const wallX = 82.0;
  const galleryHeight = 7.0;

  const add = (object: THREE.Object3D, role: string, materialFamily = "GALVANIZED_STEEL") => {
    object.userData.pressurePlantSlice = true;
    object.userData.pressurePlantDetailId = record.id;
    object.userData.presentationOnly = true;
    object.userData.hostId = record.id;
    object.userData.hostSocket = "low_shed_west_service_wall_pipe_endpoint";
    object.userData.supportClass = "SUPPORTED";
    object.userData.authoringRecord = {
      type: "pressure-plant-detail",
      ...record,
      role,
      materialFamily,
      visualHostOffset: { x: -28, y: 0, z: 14 },
    };
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    group.add(object);
  };

  for (const z of [galleryZMin, galleryZMax]) {
    const baseplate = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.14, 1.1, 4, 0.04), concrete);
    baseplate.position.set(galleryX, 0.07, z);
    add(baseplate, "camera_service_gallery_grounded_support_baseplate", "CONCRETE");

    const upright = new THREE.Mesh(new RoundedBoxGeometry(0.3, galleryHeight, 0.3, 4, 0.04), steel);
    upright.position.set(galleryX, galleryHeight / 2, z);
    add(upright, "camera_service_gallery_grounded_support_upright");

    const footCollar = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.16, 0.62, 4, 0.035), darkSteel);
    footCollar.position.set(galleryX, 0.18, z);
    add(footCollar, "camera_service_gallery_upright_foot_collar", "PAINTED_STEEL");

    const wallBracket = new THREE.Mesh(new RoundedBoxGeometry(1.48, 0.2, 0.26, 4, 0.04), darkSteel);
    wallBracket.position.set((galleryX + wallX) / 2, 4.65, z);
    add(wallBracket, "camera_service_gallery_wall_bracket", "PAINTED_STEEL");
  }

  const pipeSpecs = [
    { y: 1.55, radius: 0.24, zOffset: -0.58 },
    { y: 3.18, radius: 0.19, zOffset: 0.0 },
    { y: 4.72, radius: 0.14, zOffset: 0.58 },
  ];
  for (const [index, pipeSpec] of pipeSpecs.entries()) {
    const length = galleryZMax - galleryZMin + 0.42;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeSpec.radius, pipeSpec.radius * 1.04, length, 20, 2), pipeMetal);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(galleryX, pipeSpec.y, (galleryZMin + galleryZMax) / 2 + pipeSpec.zOffset);
    add(pipe, `camera_service_gallery_process_pipe_${index + 1}`);

    for (const z of [galleryZMin + 0.42, galleryZMax - 0.42]) {
      const pipeCollar = new THREE.Mesh(new THREE.TorusGeometry(pipeSpec.radius * 1.28, 0.055, 8, 20), steel);
      pipeCollar.rotation.x = Math.PI / 2;
      pipeCollar.position.set(galleryX, pipeSpec.y, z + pipeSpec.zOffset);
      add(pipeCollar, `camera_service_gallery_process_pipe_${index + 1}_collar`);
    }

    const saddle = new THREE.Mesh(new RoundedBoxGeometry(0.88, 0.16, 0.72, 4, 0.035), darkSteel);
    saddle.position.set(galleryX, pipeSpec.y - pipeSpec.radius - 0.12, (galleryZMin + galleryZMax) / 2 + pipeSpec.zOffset);
    add(saddle, `camera_service_gallery_process_pipe_${index + 1}_support_saddle`, "PAINTED_STEEL");
  }

  const nearRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.0, 20, 2), pipeMetal);
  nearRiser.position.set(galleryX, 6.0, galleryZMin - 0.58);
  add(nearRiser, "camera_service_gallery_near_vertical_riser");
  const nearElbow = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 20, Math.PI / 2), pipeMetal);
  nearElbow.rotation.set(Math.PI / 2, 0, 0);
  nearElbow.position.set(galleryX, galleryHeight - 0.5, galleryZMin - 0.58);
  add(nearElbow, "camera_service_gallery_near_riser_elbow");
  const nearWallDrop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.45, 20, 2), pipeMetal);
  nearWallDrop.position.set((galleryX + wallX) / 2, galleryHeight - 0.5, galleryZMin - 0.58);
  nearWallDrop.rotation.z = Math.PI / 2;
  add(nearWallDrop, "camera_service_gallery_near_wall_termination");

  const farRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.3, 20, 2), pipeMetal);
  farRiser.position.set(galleryX, 5.85, galleryZMax + 0.58);
  add(farRiser, "camera_service_gallery_far_vertical_riser");
  const farTermination = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.5, 1.2, 4, 0.04), darkSteel);
  farTermination.position.set(wallX - 0.22, 6.95, galleryZMax + 0.58);
  add(farTermination, "camera_service_gallery_far_wall_endpoint", "PAINTED_STEEL");

  for (const z of [56.1, 63.4]) {
    const valveStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.68, 14), steel);
    valveStem.rotation.z = Math.PI / 2;
    valveStem.position.set(galleryX - 0.3, 3.18, z);
    add(valveStem, "camera_service_gallery_valve_stem");
    const valveWheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.075, 8, 20), steel);
    valveWheel.rotation.y = Math.PI / 2;
    valveWheel.position.set(galleryX - 0.64, 3.18, z);
    add(valveWheel, "camera_service_gallery_valve_wheel");
    const valveMark = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.22, 0.68, 3, 0.03), warning);
    valveMark.position.set(galleryX - 0.72, 3.18, z);
    valveMark.rotation.y = Math.PI / 4;
    add(valveMark, "camera_service_gallery_valve_warning_handle", "PAINTED_STEEL");
  }

  const cableTray = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.16, galleryZMax - galleryZMin + 0.5, 4, 0.03), darkSteel);
  cableTray.position.set(galleryX + 0.56, 5.85, (galleryZMin + galleryZMax) / 2);
  add(cableTray, "camera_service_gallery_high_cable_tray", "PAINTED_STEEL");
  for (const z of [galleryZMin + 1.0, galleryZMin + 3.4, galleryZMin + 5.8, galleryZMax - 0.8]) {
    const trayBrace = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.12, 0.12, 3, 0.025), steel);
    trayBrace.position.set(galleryX + 0.18, 5.72, z);
    trayBrace.rotation.y = Math.PI / 2;
    add(trayBrace, "camera_service_gallery_cable_tray_brace");
  }

  const statusLight = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.3, 0.72, 3, 0.03), warm);
  statusLight.position.set(galleryX - 0.72, 5.22, galleryZMin + 0.85);
  add(statusLight, "camera_service_gallery_warm_status_light", "PAINTED_STEEL");
  const point = new THREE.PointLight(0xffa466, 2.8, 7.0, 2.0);
  point.position.set(galleryX - 0.6, 5.0, galleryZMin + 0.85);
  point.userData.pressurePlantSlice = true;
  point.userData.pressurePlantDetailId = record.id;
  point.userData.presentationOnly = true;
  point.userData.hostId = record.id;
  point.userData.hostSocket = "low_shed_west_service_wall_pipe_endpoint";
  point.userData.supportClass = "SUPPORTED";
  point.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_service_gallery_warm_status_practical" };
  group.add(point);

  root.add(group);
}
