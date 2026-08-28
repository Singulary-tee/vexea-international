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
 * Source-attached facade occupancy. The anchor is derived from the loaded
 * camera facade clone's world bounds, so this is a real front-face extension
 * with a source-backed mass behind it rather than a detached camera plate.
 */
export function addPressurePlantCameraFacadeDockRow({
  root,
  record,
  pressureMaterial,
  bounds,
}: {
  root: THREE.Group;
  record: PressurePlantSliceDetail;
  pressureMaterial: PressureMaterialFactory;
  bounds: THREE.Box3;
}) {
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const frontZ = bounds.max.z + 0.28;
  const rowWidth = Math.min(24.0, Math.max(18.0, size.x * 0.86));
  const bayCenters = [center.x - 7.4, center.x, center.x + 7.4];
  const bayWidth = 6.35;
  const bayHeight = 6.4;
  const bayBottom = Math.max(0.28, bounds.min.y + 0.24);
  const dark = pressureMaterial(record, 0x172526, 0.9, 0.24);
  const doorMetal = pressureMaterial(record, 0x4b5b55, 0.76, 0.5);
  const steel = pressureMaterial(record, 0x354644, 0.6, 0.68);
  const trim = pressureMaterial(record, 0x8b897d, 0.8, 0.25);
  const concrete = pressureMaterial(record, 0x85847b, 0.94, 0.055);
  const rubber = pressureMaterial(record, 0x242b2a, 0.94, 0.04);
  const practical = new THREE.MeshStandardMaterial({ color: 0xffc18b, emissive: 0x6e3219, emissiveIntensity: 0.85, roughness: 0.3, metalness: 0.04 });
  const safety = pressureMaterial(record, 0xa06c42, 0.78, 0.16);
  const group = new THREE.Group();
  group.name = "pressure_plant_camera_facade_dock_row";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = record.hostSocket;
  group.userData.supportClass = "SUPPORTED";
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "source_attached_camera_facade_dock_row", materialFamily: "PAINTED_STEEL", presentationOnly: true, sourceBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } };
  const add = (mesh: THREE.Mesh, role: string, materialFamily = "PAINTED_STEEL") => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.hostId = record.id;
    mesh.userData.hostSocket = record.hostSocket;
    mesh.userData.supportClass = "SUPPORTED";
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role, materialFamily, presentationOnly: true };
    mesh.castShadow = !/rib|lamp|bollard/i.test(role);
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  const landing = new THREE.Mesh(new RoundedBoxGeometry(rowWidth + 3.2, 0.28, 4.7, 5, 0.08), concrete);
  landing.position.set(center.x, bayBottom - 0.12, frontZ + 2.0);
  add(landing, "grounded_dock_landing", "CONCRETE");
  const landingEdge = new THREE.Mesh(new RoundedBoxGeometry(rowWidth + 2.6, 0.22, 0.28, 4, 0.04), trim);
  landingEdge.position.set(center.x, bayBottom + 0.08, frontZ + 4.18);
  add(landingEdge, "dock_landing_front_edge", "CONCRETE");

  for (const [index, x] of bayCenters.entries()) {
    const reveal = new THREE.Mesh(new RoundedBoxGeometry(bayWidth + 0.82, bayHeight + 0.72, 0.38, 4, 0.08), dark);
    reveal.position.set(x, bayBottom + bayHeight / 2, frontZ + 0.12);
    add(reveal, `bay_${index + 1}_deep_reveal`, "PAINTED_STEEL");
    const door = new THREE.Mesh(new RoundedBoxGeometry(bayWidth - 0.58, bayHeight, 0.16, 4, 0.035), doorMetal);
    door.position.set(x, bayBottom + bayHeight / 2, frontZ + 0.38);
    add(door, `bay_${index + 1}_rolling_door`, "PAINTED_STEEL");
    for (let rib = 0; rib < 6; rib += 1) {
      const line = new THREE.Mesh(new RoundedBoxGeometry(bayWidth - 0.94, 0.075, 0.18, 3, 0.02), steel);
      line.position.set(x, bayBottom + 0.55 + rib * 0.94, frontZ + 0.5);
      add(line, `bay_${index + 1}_rolling_rib_${rib + 1}`, "GALVANIZED_STEEL");
    }
    for (const side of [-1, 1]) {
      const jamb = new THREE.Mesh(new RoundedBoxGeometry(0.36, bayHeight + 0.72, 0.46, 4, 0.06), trim);
      jamb.position.set(x + side * (bayWidth / 2 + 0.08), bayBottom + bayHeight / 2, frontZ + 0.42);
      add(jamb, `bay_${index + 1}_jamb_${side < 0 ? "left" : "right"}`, "CONCRETE");
      const bollard = new THREE.Mesh(new RoundedBoxGeometry(0.32, 1.0, 0.32, 4, 0.05), safety);
      bollard.position.set(x + side * (bayWidth / 2 - 0.42), bayBottom + 0.5, frontZ + 2.35);
      add(bollard, `bay_${index + 1}_safety_bollard_${side < 0 ? "left" : "right"}`);
      const cap = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.08, 0.38, 3, 0.02), trim);
      cap.position.set(bollard.position.x, bayBottom + 1.04, bollard.position.z);
      add(cap, `bay_${index + 1}_safety_bollard_cap_${side < 0 ? "left" : "right"}`, "GALVANIZED_STEEL");
    }
    const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.2, 0.26, 3, 0.04), practical);
    lamp.position.set(x, bayBottom + bayHeight + 0.42, frontZ + 0.52);
    add(lamp, `bay_${index + 1}_practical_wall_lamp`, "PAINTED_STEEL");
  }

  const canopy = new THREE.Mesh(new RoundedBoxGeometry(rowWidth + 3.2, 0.34, 3.4, 5, 0.08), steel);
  canopy.position.set(center.x, bayBottom + bayHeight + 1.22, frontZ + 1.35);
  canopy.rotation.x = -0.035;
  add(canopy, "shared_loading_canopy", "GALVANIZED_STEEL");
  const canopyHeader = new THREE.Mesh(new RoundedBoxGeometry(rowWidth + 2.2, 0.34, 0.28, 4, 0.05), trim);
  canopyHeader.position.set(center.x, bayBottom + bayHeight + 0.7, frontZ + 0.58);
  add(canopyHeader, "shared_loading_canopy_wall_header", "GALVANIZED_STEEL");
  for (const x of [center.x - rowWidth / 2 - 0.4, center.x - rowWidth / 6, center.x + rowWidth / 6, center.x + rowWidth / 2 + 0.4]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.26, bayBottom + bayHeight + 0.78, 0.26, 4, 0.05), steel);
    post.position.set(x, (bayBottom + bayHeight + 0.78) / 2, frontZ + 2.62);
    add(post, "shared_loading_canopy_grounded_post", "GALVANIZED_STEEL");
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.12, 0.68, 4, 0.04), concrete);
    foot.position.set(x, 0.06, frontZ + 2.62);
    add(foot, "shared_loading_canopy_post_foot", "CONCRETE");
  }
  const downpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 6.9, 12), steel);
  downpipe.position.set(center.x + rowWidth / 2 + 0.62, 3.45, frontZ + 0.58);
  add(downpipe, "dock_canopy_downpipe", "GALVANIZED_STEEL");
  group.position.y = 0;
  root.add(group);
}
