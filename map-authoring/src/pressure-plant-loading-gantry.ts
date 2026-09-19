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
 * One camera-visible loading gantry attached to the open eastern service band.
 * It is presentation-only: the frozen shell, route, cover, and deployment
 * records remain authoritative and are not moved or replaced.
 */
export function addPressurePlantLoadingGantry({
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
  group.name = "pressure_plant_eastern_loading_gantry";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = "pressure_eastern_service_gantry";
  group.userData.supportClass = "GROUNDED";
  group.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    role: "camera_visible_eastern_loading_gantry_owner",
    materialFamily: "LOADING_GANTRY",
    presentationOnly: true,
  };

  const steel = pressureMaterial(record, 0x43514e, 0.72, 0.72);
  const darkSteel = pressureMaterial(record, 0x1d2b2a, 0.9, 0.42);
  const galvanized = pressureMaterial(record, 0x7b8580, 0.66, 0.78);
  const concrete = pressureMaterial(record, 0x757b74, 0.95, 0.035);
  const rubber = pressureMaterial(record, 0x242a29, 0.98, 0.08);
  const warning = new THREE.MeshStandardMaterial({ color: 0xb16c33, roughness: 0.74, metalness: 0.14 });
  const warm = new THREE.MeshStandardMaterial({ color: 0xffb56d, emissive: 0x6b2d14, emissiveIntensity: 1.25, roughness: 0.28, metalness: 0.06 });

  const padTexture = surfaceTexture?.clone();
  if (padTexture) {
    padTexture.wrapS = THREE.RepeatWrapping;
    padTexture.wrapT = THREE.RepeatWrapping;
    padTexture.repeat.set(3.2, 1.8);
    padTexture.offset.set(0.22, 0.05);
    padTexture.needsUpdate = true;
    concrete.map = padTexture;
    concrete.bumpMap = padTexture.clone();
    concrete.bumpMap.wrapS = THREE.RepeatWrapping;
    concrete.bumpMap.wrapT = THREE.RepeatWrapping;
    concrete.bumpMap.repeat.copy(padTexture.repeat);
    concrete.bumpMap.offset.copy(padTexture.offset);
    concrete.bumpScale = 0.04;
    concrete.needsUpdate = true;
  }

  const add = (mesh: THREE.Mesh, role: string, materialFamily = "LOADING_GANTRY") => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.hostId = record.id;
    mesh.userData.hostSocket = "pressure_eastern_service_gantry";
    mesh.userData.supportClass = "GROUNDED";
    mesh.userData.authoringRecord = {
      type: "pressure-plant-detail",
      ...record,
      role,
      materialFamily,
      presentationOnly: true,
      hostSocket: "pressure_eastern_service_gantry",
    };
    group.add(mesh);
  };

  const centerX = 176;
  const centerZ = 75;
  const pad = new THREE.Mesh(new RoundedBoxGeometry(15.8, 0.18, 6.8, 5, 0.06), concrete);
  pad.position.set(centerX, 0.09, centerZ);
  add(pad, "eastern_loading_gantry_grounded_service_pad", "CONCRETE_SERVICE_APRON");

  const backWall = new THREE.Mesh(new RoundedBoxGeometry(15.2, 5.1, 0.18, 5, 0.045), darkSteel);
  backWall.position.set(centerX, 2.62, 71.9);
  add(backWall, "eastern_loading_gantry_recessed_service_wall", "PAINTED_STEEL");
  const door = new THREE.Mesh(new RoundedBoxGeometry(7.2, 4.25, 0.12, 5, 0.035), darkSteel);
  door.position.set(centerX, 2.18, 71.76);
  add(door, "eastern_loading_gantry_recessed_rollup_dock_door", "DOCK_DOOR");
  const doorHeader = new THREE.Mesh(new RoundedBoxGeometry(7.75, 0.28, 0.3, 4, 0.04), galvanized);
  doorHeader.position.set(centerX, 4.48, 71.58);
  add(doorHeader, "eastern_loading_gantry_dock_door_header", "GALVANIZED_STEEL");
  for (const x of [172.35, 179.65]) {
    const jamb = new THREE.Mesh(new RoundedBoxGeometry(0.28, 4.55, 0.28, 4, 0.035), galvanized);
    jamb.position.set(x, 2.28, 71.6);
    add(jamb, "eastern_loading_gantry_dock_door_jamb", "GALVANIZED_STEEL");
  }

  // Repeated narrow ribs keep the broad wall from reading as a single flat slab.
  for (const x of [168.8, 171.2, 180.8, 183.2]) {
    const rib = new THREE.Mesh(new RoundedBoxGeometry(0.11, 4.82, 0.25, 3, 0.025), steel);
    rib.position.set(x, 2.55, 71.68);
    add(rib, "eastern_loading_gantry_corrugated_wall_vertical_rib", "CORRUGATED_STEEL");
  }

  const frameXs = [168.0, 184.0];
  for (const [index, x] of frameXs.entries()) {
    for (const z of [72.3, 77.7]) {
      const post = new THREE.Mesh(new RoundedBoxGeometry(0.34, 5.3, 0.34, 4, 0.045), steel);
      post.position.set(x, 2.65, z);
      add(post, `eastern_loading_gantry_portal_post_${index + 1}`, "GALVANIZED_STEEL");
      const foot = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.14, 0.9, 4, 0.045), concrete);
      foot.position.set(x, 0.07, z);
      add(foot, `eastern_loading_gantry_portal_post_${index + 1}_foot`, "CONCRETE");
    }
    const beam = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.36, 5.75, 4, 0.05), galvanized);
    beam.position.set(x, 5.18, centerZ);
    add(beam, `eastern_loading_gantry_portal_crossbeam_${index + 1}`, "GALVANIZED_STEEL");
  }

  const canopy = new THREE.Mesh(new RoundedBoxGeometry(16.5, 0.28, 6.1, 5, 0.08), steel);
  canopy.position.set(centerX, 5.45, centerZ);
  canopy.rotation.x = -0.035;
  add(canopy, "eastern_loading_gantry_supported_weather_canopy", "GALVANIZED_STEEL");
  const canopyEdge = new THREE.Mesh(new RoundedBoxGeometry(16.1, 0.2, 0.18, 4, 0.035), galvanized);
  canopyEdge.position.set(centerX, 5.25, 78.03);
  add(canopyEdge, "eastern_loading_gantry_canopy_front_edge", "GALVANIZED_STEEL");

  for (const x of [170.0, 182.0]) {
    const dockLight = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.16, 0.28, 3, 0.035), warm);
    dockLight.position.set(x, 4.7, 71.38);
    add(dockLight, "eastern_loading_gantry_warm_dock_practical", "PAINTED_STEEL");
    const point = new THREE.PointLight(0xffa66d, 4.0, 9.0, 2.0);
    point.position.set(x, 4.55, 72.0);
    point.userData.pressurePlantSlice = true;
    point.userData.presentationOnly = true;
    point.userData.hostId = record.id;
    point.userData.hostSocket = "pressure_eastern_service_gantry";
    point.userData.supportClass = "SUPPORTED";
    point.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "eastern_loading_gantry_warm_dock_practical" };
    group.add(point);
  }

  const conduit = new THREE.Mesh(new RoundedBoxGeometry(11.2, 0.16, 0.16, 3, 0.025), galvanized);
  conduit.position.set(centerX, 4.62, 72.0);
  add(conduit, "eastern_loading_gantry_service_conduit_run", "GALVANIZED_STEEL");
  for (const x of [170.0, 176.0, 182.0]) {
    const clip = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.3, 0.28, 3, 0.025), darkSteel);
    clip.position.set(x, 4.48, 72.0);
    add(clip, "eastern_loading_gantry_conduit_support_clip", "PAINTED_STEEL");
  }

  const bumper = new THREE.Mesh(new RoundedBoxGeometry(7.65, 0.38, 0.34, 4, 0.05), rubber);
  bumper.position.set(centerX, 0.48, 77.32);
  add(bumper, "eastern_loading_gantry_vehicle_bumper", "RUBBER");
  const warningBand = new THREE.Mesh(new RoundedBoxGeometry(3.8, 0.13, 0.2, 3, 0.025), warning);
  warningBand.position.set(centerX, 0.9, 77.2);
  warningBand.rotation.y = -0.04;
  add(warningBand, "eastern_loading_gantry_hazard_edge_marking", "PAINTED_STEEL");

  root.add(group);
}
