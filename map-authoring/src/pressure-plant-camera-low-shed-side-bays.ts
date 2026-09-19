import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PressurePlantSliceDetail } from "./pressure-plant-slice-details";

type PressureMaterialFactory = (
  record: PressurePlantSliceDetail,
  colorOverride?: number,
  roughnessOverride?: number,
  metalnessOverride?: number,
) => THREE.MeshStandardMaterial;
type AddLowShedMesh = (mesh: THREE.Mesh, role: string, materialFamily?: string) => void;

/**
 * Replaces the blank lower band of the low-shed west elevation with one
 * coherent service frontage. Coordinates are local to the already grounded
 * low-shed group, so the wall contact is explicit and the existing world-space
 * gameplay footprint remains unchanged.
 */
export function addPressurePlantCameraLowShedSideBays({
  record,
  leftX,
  pressureMaterial,
  add,
}: {
  record: PressurePlantSliceDetail;
  leftX: number;
  pressureMaterial: PressureMaterialFactory;
  add: AddLowShedMesh;
}) {
  const wallFaceX = leftX - 0.24;
  const recessX = leftX - 0.42;
  const doorX = leftX - 0.66;
  const canopyX = leftX - 2.25;
  const bayCenters = [-11.0, 0.0, 11.0];
  const baySpan = 8.1;
  const doorBottom = 0.62;
  const doorHeight = 4.85;
  const doorCenterY = doorBottom + doorHeight / 2;
  const door = pressureMaterial(record, 0x172727, 0.9, 0.2);
  const doorRib = pressureMaterial(record, 0x3b4c48, 0.68, 0.6);
  const steel = pressureMaterial(record, 0x334543, 0.6, 0.68);
  const trim = pressureMaterial(record, 0x85867b, 0.82, 0.22);
  const concrete = pressureMaterial(record, 0x85847a, 0.94, 0.055);
  const rubber = pressureMaterial(record, 0x252d2c, 0.93, 0.04);
  const practical = new THREE.MeshStandardMaterial({ color: 0xffc17c, emissive: 0x6d3819, emissiveIntensity: 0.92, roughness: 0.3, metalness: 0.06 });
  const warning = pressureMaterial(record, 0x95613d, 0.78, 0.2);

  const addPart = (mesh: THREE.Mesh, role: string, family = "PAINTED_STEEL") => {
    add(mesh, `low_shed_camera_side_bays_${role}`, family);
  };

  const sharedLanding = new THREE.Mesh(new RoundedBoxGeometry(4.65, 0.26, 34.6, 5, 0.06), concrete);
  sharedLanding.position.set(leftX - 2.05, 0.16, 0);
  addPart(sharedLanding, "shared_grounded_loading_landing", "CONCRETE");
  const landingFrontEdge = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.22, 34.0, 4, 0.04), trim);
  landingFrontEdge.position.set(leftX - 4.42, 0.35, 0);
  addPart(landingFrontEdge, "shared_landing_front_edge", "CONCRETE");

  for (const [index, z] of bayCenters.entries()) {
    const reveal = new THREE.Mesh(new RoundedBoxGeometry(0.34, doorHeight + 0.62, baySpan + 0.86, 4, 0.07), steel);
    reveal.position.set(recessX, doorCenterY, z);
    addPart(reveal, `bay_${index + 1}_deep_reveal`, "GALVANIZED_STEEL");

    const panel = new THREE.Mesh(new RoundedBoxGeometry(0.13, doorHeight, baySpan - 0.72, 4, 0.035), door);
    panel.position.set(doorX, doorCenterY, z);
    addPart(panel, `bay_${index + 1}_recessed_rolling_door`, "PAINTED_STEEL");
    for (let rib = 0; rib < 6; rib += 1) {
      const line = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.075, baySpan - 1.1, 3, 0.018), doorRib);
      line.position.set(doorX - 0.1, 1.0 + rib * 0.72, z);
      addPart(line, `bay_${index + 1}_rolling_rib_${rib + 1}`, "GALVANIZED_STEEL");
    }

    const leftJamb = new THREE.Mesh(new RoundedBoxGeometry(0.42, doorHeight + 0.72, 0.4, 4, 0.06), trim);
    leftJamb.position.set(wallFaceX - 0.1, doorCenterY, z - baySpan / 2 - 0.12);
    addPart(leftJamb, `bay_${index + 1}_jamb_left`, "CONCRETE");
    const rightJamb = leftJamb.clone();
    rightJamb.position.z = z + baySpan / 2 + 0.12;
    rightJamb.userData = { ...leftJamb.userData, authoringRecord: { type: "pressure-plant-detail", ...record, role: `low_shed_camera_side_bays_bay_${index + 1}_jamb_right`, materialFamily: "CONCRETE", presentationOnly: true } };
    add(rightJamb, `low_shed_camera_side_bays_bay_${index + 1}_jamb_right`, "CONCRETE");

    const sill = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.16, baySpan - 0.5, 4, 0.04), trim);
    sill.position.set(wallFaceX - 0.12, 0.52, z);
    addPart(sill, `bay_${index + 1}_threshold_sill`, "CONCRETE");

    const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.58, 0.86, 3, 0.05), practical);
    lamp.position.set(wallFaceX - 0.78, 5.2, z - baySpan / 2 + 1.0);
    addPart(lamp, `bay_${index + 1}_warm_practical`, "PAINTED_STEEL");
  }

  const canopy = new THREE.Mesh(new RoundedBoxGeometry(4.85, 0.32, 35.5, 5, 0.07), steel);
  canopy.position.set(canopyX, 5.95, 0);
  canopy.rotation.x = -0.035;
  addPart(canopy, "shared_weather_canopy", "GALVANIZED_STEEL");
  const canopyHeader = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.28, 35.0, 4, 0.05), trim);
  canopyHeader.position.set(wallFaceX - 0.52, 5.58, 0);
  addPart(canopyHeader, "shared_canopy_wall_header", "GALVANIZED_STEEL");
  for (const z of [-16.2, -5.4, 5.4, 16.2]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.28, 5.35, 0.28, 4, 0.05), steel);
    post.position.set(canopyX - 2.05, 3.05, z);
    addPart(post, "shared_canopy_grounded_post", "GALVANIZED_STEEL");
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.12, 0.72, 4, 0.04), concrete);
    foot.position.set(canopyX - 2.05, 0.06, z);
    addPart(foot, "shared_canopy_post_foot", "CONCRETE");
  }

  for (const z of [-16.4, -5.45, 5.45, 16.4]) {
    const bollard = new THREE.Mesh(new RoundedBoxGeometry(0.34, 1.12, 0.34, 4, 0.05), warning);
    bollard.position.set(leftX - 3.42, 0.56, z);
    addPart(bollard, "loading_landing_safety_bollard", "PAINTED_STEEL");
    const cap = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.08, 0.4, 3, 0.02), trim);
    cap.position.set(leftX - 3.42, 1.16, z);
    addPart(cap, "loading_landing_safety_bollard_cap", "GALVANIZED_STEEL");
  }

  for (const z of [-16.8, -5.6, 5.6, 16.8]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 5.55, 12), steel);
    pipe.position.set(wallFaceX - 0.44, 2.8, z);
    addPart(pipe, "service_frontage_downpipe", "GALVANIZED_STEEL");
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.38, 12), steel);
    foot.position.set(wallFaceX - 0.44, 0.24, z);
    addPart(foot, "service_frontage_downpipe_foot", "GALVANIZED_STEEL");
  }

  const centralAccessRail = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.14, 5.3, 3, 0.025), steel);
  centralAccessRail.position.set(leftX - 3.25, 1.22, 21.5);
  addPart(centralAccessRail, "shared_landing_end_handrail", "GALVANIZED_STEEL");
  for (const z of [19.2, 23.8]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.92, 0.14, 3, 0.025), steel);
    post.position.set(leftX - 3.25, 0.72, z);
    addPart(post, "shared_landing_end_handrail_post", "GALVANIZED_STEEL");
  }
}
