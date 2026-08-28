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
 * A single camera-visible process catwalk attached to the plant west wall.
 * It is presentation-only and occupies the blank interval between existing
 * service bays; the frozen plant volume, route, cover, and stair/ramp records
 * remain the owners of gameplay and traversal truth.
 */
export function addPressurePlantCameraProcessCatwalk({
  root,
  record,
  pressureMaterial,
}: {
  root: THREE.Group;
  record: PressurePlantSliceDetail;
  pressureMaterial: PressureMaterialFactory;
}) {
  const group = new THREE.Group();
  group.name = "pressure_plant_camera_process_catwalk";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = "image_plant_building_south_service_frame";
  group.userData.supportClass = "SUPPORTED";
  group.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    role: "camera_visible_supported_west_wall_process_catwalk",
    materialFamily: "GALVANIZED_STEEL",
    visualHostOffset: { x: -68, y: 0, z: 0 },
  };

  const steel = pressureMaterial(record, 0x344542, 0.6, 0.7);
  const darkSteel = pressureMaterial(record, 0x1d2b2b, 0.82, 0.48);
  const pipeMetal = pressureMaterial(record, 0x69756d, 0.54, 0.78);
  const gratedDeck = pressureMaterial(record, 0x4a5955, 0.76, 0.62);
  const concrete = pressureMaterial(record, 0x777d76, 0.95, 0.05);
  const warning = new THREE.MeshStandardMaterial({ color: 0xb6783d, roughness: 0.76, metalness: 0.15 });
  const warm = new THREE.MeshStandardMaterial({ color: 0xffc07e, emissive: 0x71381d, emissiveIntensity: 0.72, roughness: 0.3, metalness: 0.08 });

  const wallX = 149.1;
  const outerX = 143.2;
  const deckY = 14.2;
  const zMin = 47.5;
  const zMax = 78.5;
  const zMid = (zMin + zMax) / 2;
  const span = zMax - zMin;
  const apronY = 6.04;

  const add = (object: THREE.Object3D, role: string, materialFamily = "GALVANIZED_STEEL") => {
    object.userData.pressurePlantSlice = true;
    object.userData.pressurePlantDetailId = record.id;
    object.userData.presentationOnly = true;
    object.userData.hostId = record.id;
    object.userData.hostSocket = "image_plant_building_south_service_frame";
    object.userData.supportClass = "SUPPORTED";
    object.userData.authoringRecord = {
      type: "pressure-plant-detail",
      ...record,
      role,
      materialFamily,
      visualHostOffset: { x: -68, y: 0, z: 0 },
    };
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    group.add(object);
  };

  for (const z of [zMin, zMax]) {
    const baseplate = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.16, 1.5, 4, 0.05), concrete);
    baseplate.position.set(outerX, apronY + 0.08, z);
    add(baseplate, "camera_process_catwalk_grounded_support_baseplate", "CONCRETE");

    const support = new THREE.Mesh(new RoundedBoxGeometry(0.38, deckY - apronY, 0.38, 4, 0.04), steel);
    support.position.set(outerX, apronY + (deckY - apronY) / 2, z);
    add(support, "camera_process_catwalk_grounded_support_leg");

    const supportFoot = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.2, 0.72, 4, 0.035), darkSteel);
    supportFoot.position.set(outerX, apronY + 0.25, z);
    add(supportFoot, "camera_process_catwalk_support_foot_collar", "PAINTED_STEEL");

    const wallBracket = new THREE.Mesh(new RoundedBoxGeometry(wallX - outerX + 0.25, 0.22, 0.3, 4, 0.04), darkSteel);
    wallBracket.position.set((wallX + outerX) / 2, deckY - 0.42, z);
    add(wallBracket, "camera_process_catwalk_wall_supported_bracket", "PAINTED_STEEL");
  }

  const deck = new THREE.Mesh(new RoundedBoxGeometry(wallX - outerX + 0.5, 0.22, span + 0.8, 4, 0.045), gratedDeck);
  deck.position.set((wallX + outerX) / 2, deckY, zMid);
  add(deck, "camera_process_catwalk_grounded_span_deck", "GALVANIZED_STEEL");
  for (let z = zMin + 0.8; z < zMax; z += 1.6) {
    const grateBar = new THREE.Mesh(new RoundedBoxGeometry(wallX - outerX - 0.4, 0.07, 0.1, 3, 0.02), darkSteel);
    grateBar.position.set((wallX + outerX) / 2, deckY + 0.15, z);
    add(grateBar, "camera_process_catwalk_grated_deck_crossbar", "PAINTED_STEEL");
  }

  const guardRailX = outerX - 0.08;
  for (const z of [zMin, zMin + 7.75, zMid, zMax - 7.75, zMax]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.2, 2.05, 0.2, 3, 0.03), steel);
    post.position.set(guardRailX, deckY + 1.02, z);
    add(post, "camera_process_catwalk_guardrail_post");
  }
  const topRail = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.18, span, 3, 0.03), steel);
  topRail.position.set(guardRailX, deckY + 2.05, zMid);
  add(topRail, "camera_process_catwalk_guardrail_top_rail");
  const midRail = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.13, span, 3, 0.025), darkSteel);
  midRail.position.set(guardRailX, deckY + 0.92, zMid);
  add(midRail, "camera_process_catwalk_guardrail_mid_rail", "PAINTED_STEEL");
  const toeBoard = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.38, span, 3, 0.03), darkSteel);
  toeBoard.position.set(guardRailX, deckY + 0.32, zMid);
  add(toeBoard, "camera_process_catwalk_guardrail_toe_board", "PAINTED_STEEL");

  const pipeSpecs = [
    { y: 8.2, radius: 0.3, x: outerX + 0.92 },
    { y: 10.75, radius: 0.22, x: outerX + 1.55 },
    { y: 13.1, radius: 0.16, x: outerX + 2.18 },
  ];
  for (const [index, spec] of pipeSpecs.entries()) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(spec.radius, spec.radius * 1.04, span + 0.9, 20, 2), pipeMetal);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(spec.x, spec.y, zMid);
    add(pipe, `camera_process_catwalk_process_pipe_${index + 1}`);

    for (const z of [zMin + 0.55, zMid, zMax - 0.55]) {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(spec.radius * 1.3, 0.055, 8, 20), steel);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(spec.x, spec.y, z);
      add(collar, `camera_process_catwalk_process_pipe_${index + 1}_collar`);
    }

    for (const z of [zMin + 3.1, zMax - 3.1]) {
      const bracket = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.18, 1.0, 3, 0.03), darkSteel);
      bracket.position.set(spec.x, spec.y - spec.radius - 0.16, z);
      add(bracket, `camera_process_catwalk_process_pipe_${index + 1}_saddle`, "PAINTED_STEEL");
    }
  }

  const nearRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7.6, 20, 2), pipeMetal);
  nearRiser.position.set(outerX + 0.92, 10.0, zMin - 0.55);
  add(nearRiser, "camera_process_catwalk_near_ground_to_pipe_riser");
  const nearRiserFoot = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.18, 0.82, 4, 0.04), concrete);
  nearRiserFoot.position.set(outerX + 0.92, apronY + 0.1, zMin - 0.55);
  add(nearRiserFoot, "camera_process_catwalk_near_riser_ground_foot", "CONCRETE");
  const nearValve = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.095, 8, 24), steel);
  nearValve.rotation.y = Math.PI / 2;
  nearValve.position.set(outerX + 0.6, 11.2, zMin - 0.55);
  add(nearValve, "camera_process_catwalk_near_valve_wheel");
  const nearWarning = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.26, 0.95, 3, 0.03), warning);
  nearWarning.position.set(outerX + 0.28, 11.2, zMin - 0.55);
  nearWarning.rotation.y = Math.PI / 4;
  add(nearWarning, "camera_process_catwalk_near_valve_warning_handle", "PAINTED_STEEL");

  const farRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.3, 20, 2), pipeMetal);
  farRiser.position.set(outerX + 2.18, 15.0, zMax + 0.48);
  add(farRiser, "camera_process_catwalk_far_wall_riser");
  const farTermination = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.5, 1.1, 4, 0.04), darkSteel);
  farTermination.position.set(wallX - 0.22, 16.95, zMax + 0.48);
  add(farTermination, "camera_process_catwalk_far_wall_endpoint", "PAINTED_STEEL");

  const serviceBox = new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.15, 1.35, 4, 0.06), darkSteel);
  serviceBox.position.set(outerX + 0.6, deckY + 0.78, zMid - 3.8);
  add(serviceBox, "camera_process_catwalk_service_box", "PAINTED_STEEL");
  const serviceBoxFace = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.52, 0.82, 3, 0.02), warning);
  serviceBoxFace.position.set(outerX + 0.22, deckY + 0.78, zMid - 3.8);
  add(serviceBoxFace, "camera_process_catwalk_service_box_warning_face", "PAINTED_STEEL");
  const serviceLamp = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.3, 0.72, 3, 0.03), warm);
  serviceLamp.position.set(outerX + 0.16, deckY + 1.58, zMid - 3.8);
  add(serviceLamp, "camera_process_catwalk_service_box_practical_light", "PAINTED_STEEL");
  const point = new THREE.PointLight(0xffa566, 3.0, 8.0, 2.0);
  point.position.set(outerX + 0.12, deckY + 1.35, zMid - 3.8);
  point.userData.pressurePlantSlice = true;
  point.userData.pressurePlantDetailId = record.id;
  point.userData.presentationOnly = true;
  point.userData.hostId = record.id;
  point.userData.hostSocket = "image_plant_building_south_service_frame";
  point.userData.supportClass = "SUPPORTED";
  point.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_process_catwalk_service_box_practical" };
  group.add(point);

  root.add(group);
}
