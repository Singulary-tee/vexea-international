import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PressurePlantSliceDetail } from "./pressure-plant-slice-details";

type PressureMaterialFactory = (
  record: PressurePlantSliceDetail,
  colorOverride?: number,
  roughnessOverride?: number,
  metalnessOverride?: number,
) => THREE.MeshStandardMaterial;

type AddForecourtMesh = (mesh: THREE.Mesh, role: string, materialFamily?: string) => void;

export function addLowShedCameraFacingForecourt({
  record,
  width,
  backZ,
  roofMaterial,
  pressureMaterial,
  add,
}: {
  record: PressurePlantSliceDetail;
  width: number;
  backZ: number;
  roofMaterial: THREE.Material;
  pressureMaterial: PressureMaterialFactory;
  add: AddForecourtMesh;
}) {
  const steel = pressureMaterial(record, 0x334342, 0.6, 0.68);
  const darkSteel = pressureMaterial(record, 0x1c2a2a, 0.86, 0.22);
  const concrete = pressureMaterial(record, 0x85847a, 0.92, 0.06);
  const warning = pressureMaterial(record, 0x95613d, 0.78, 0.2);
  const tank = pressureMaterial(record, 0x68706b, 0.72, 0.42);
  const light = new THREE.MeshStandardMaterial({ color: 0xffc17c, emissive: 0x6d3819, emissiveIntensity: 0.88, roughness: 0.3, metalness: 0.06 });
  const addPart = (mesh: THREE.Mesh, role: string, family = "PAINTED_STEEL") => add(mesh, `low_shed_forecourt_${role}`, family);

  const cameraDockX = width * 0.12;
  const cameraDockZ = backZ + 0.62;
  // The locked player view resolves this frontage at a long oblique distance;
  // keep the bay row inside the shed footprint, but give the functional facade
  // enough projected width and height to read as a service system rather than
  // three toy-sized rectangles.
  const dockWidth = 34.0;
  const dockHeight = 6.5;
  const dockBayWidth = 9.2;
  const dockBayCenters = [-11.2, 0.0, 11.2];
  const dockDoorMaterial = new THREE.MeshStandardMaterial({ color: 0x536260, roughness: 0.82, metalness: 0.42 });
  dockBayCenters.forEach((bayOffset, bayIndex) => {
    const bayX = cameraDockX + bayOffset;
    const bayOpening = new THREE.Mesh(new RoundedBoxGeometry(dockBayWidth, dockHeight, 0.24, 4, 0.05), darkSteel);
    bayOpening.position.set(bayX, dockHeight / 2, cameraDockZ + 0.08);
    addPart(bayOpening, `camera_dock_bay_${bayIndex + 1}_recessed_opening`, "PAINTED_STEEL");
    const bayInterior = new THREE.Mesh(new RoundedBoxGeometry(dockBayWidth - 1.1, dockHeight - 1.0, 0.1, 4, 0.04), pressureMaterial(record, 0x101a1b, 0.96, 0.08));
    bayInterior.position.set(bayX, dockHeight / 2 - 0.08, cameraDockZ + 0.18);
    addPart(bayInterior, `camera_dock_bay_${bayIndex + 1}_interior_shadow`, "PAINTED_STEEL");
    // The shutter is parked overhead so the dark, recessed service opening is
    // legible at the player camera; it remains real geometry with a supported
    // frame, threshold, and interior rather than a flat door decal.
    const bayDoor = new THREE.Mesh(new RoundedBoxGeometry(dockBayWidth - 1.45, 1.05, 0.08, 4, 0.035), dockDoorMaterial);
    bayDoor.position.set(bayX, dockHeight - 0.58, cameraDockZ + 0.34);
    addPart(bayDoor, `camera_dock_bay_${bayIndex + 1}_rolling_door`, "PAINTED_STEEL");
    for (let rib = 0; rib < 2; rib += 1) {
      const ribMesh = new THREE.Mesh(new RoundedBoxGeometry(dockBayWidth - 1.8, 0.07, 0.12, 3, 0.02), steel);
      ribMesh.position.set(bayX, dockHeight - 0.86 + rib * 0.48, cameraDockZ + 0.43);
      addPart(ribMesh, `camera_dock_bay_${bayIndex + 1}_rolling_door_rib`, "GALVANIZED_STEEL");
    }
    const baySill = new THREE.Mesh(new RoundedBoxGeometry(dockBayWidth - 1.1, 0.14, 0.42, 4, 0.03), concrete);
    baySill.position.set(bayX, 0.31, cameraDockZ + 0.36);
    addPart(baySill, `camera_dock_bay_${bayIndex + 1}_grounded_threshold_sill`, "CONCRETE");
    for (const side of [-1, 1]) {
      const bayJamb = new THREE.Mesh(new RoundedBoxGeometry(0.38, dockHeight + 0.46, 0.42, 4, 0.06), steel);
      bayJamb.position.set(bayX + side * (dockBayWidth / 2 + 0.22), dockHeight / 2 + 0.08, cameraDockZ + 0.38);
      addPart(bayJamb, `camera_dock_bay_${bayIndex + 1}_projecting_frame_jamb_${side < 0 ? "left" : "right"}`, "GALVANIZED_STEEL");
    }
    const bayHeader = new THREE.Mesh(new RoundedBoxGeometry(dockBayWidth + 0.86, 0.42, 0.42, 4, 0.06), steel);
    bayHeader.position.set(bayX, dockHeight + 0.28, cameraDockZ + 0.38);
    addPart(bayHeader, `camera_dock_bay_${bayIndex + 1}_projecting_frame_header`, "GALVANIZED_STEEL");
  });
  const dockHeader = new THREE.Mesh(new RoundedBoxGeometry(dockWidth + 1.6, 0.32, 2.2, 4, 0.06), roofMaterial);
  dockHeader.position.set(cameraDockX, dockHeight + 0.58, cameraDockZ + 1.22);
  addPart(dockHeader, "camera_dock_three_bay_loading_header", "GALVANIZED_STEEL");
  const dockPlatform = new THREE.Mesh(new RoundedBoxGeometry(dockWidth + 2.5, 0.28, 6.8, 5, 0.06), concrete);
  dockPlatform.position.set(cameraDockX, 0.15, cameraDockZ + 3.0);
  addPart(dockPlatform, "camera_dock_grounded_loading_platform", "CONCRETE");
  const dockBumper = new THREE.Mesh(new RoundedBoxGeometry(dockWidth - 1.0, 0.38, 0.34, 4, 0.05), warning);
  dockBumper.position.set(cameraDockX, 0.78, cameraDockZ + 1.0);
  addPart(dockBumper, "camera_dock_three_bay_rubber_bumper", "RUBBER");
  const dockWheelStop = new THREE.Mesh(new RoundedBoxGeometry(dockWidth - 2.4, 0.24, 0.28, 4, 0.04), warning);
  dockWheelStop.position.set(cameraDockX, 0.4, cameraDockZ + 5.15);
  addPart(dockWheelStop, "camera_dock_three_bay_grounded_wheel_stop", "PAINTED_STEEL");
  const dockDrain = new THREE.Mesh(new RoundedBoxGeometry(dockWidth - 2.2, 0.08, 0.5, 4, 0.025), darkSteel);
  dockDrain.position.set(cameraDockX, 0.33, cameraDockZ + 5.78);
  addPart(dockDrain, "camera_dock_three_bay_threshold_trench_drain", "DRAIN");
  for (let grate = 0; grate < 7; grate += 1) {
    const drainGrate = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.05, 0.44, 3, 0.02), steel);
    drainGrate.position.set(cameraDockX - (dockWidth - 3.4) / 2 + grate * ((dockWidth - 3.4) / 6), 0.4, cameraDockZ + 5.78);
    addPart(drainGrate, "camera_dock_three_bay_threshold_drain_grate", "GALVANIZED_STEEL");
  }

  // A short concrete loading tongue bridges the dock platform to the existing
  // camera court. It is presentation geometry only: the canonical route and
  // cover records remain owned by the slice contract and are not displaced.
  const loadingApron = new THREE.Mesh(new RoundedBoxGeometry(dockWidth + 4.0, 0.22, 6.6, 5, 0.06), concrete);
  loadingApron.position.set(cameraDockX, 0.18, cameraDockZ + 7.0);
  addPart(loadingApron, "camera_dock_camera_court_loading_apron", "CONCRETE");
  const loadingApronThreshold = new THREE.Mesh(new RoundedBoxGeometry(dockWidth + 1.6, 0.08, 0.16, 3, 0.025), darkSteel);
  loadingApronThreshold.position.set(cameraDockX, 0.34, cameraDockZ + 4.85);
  addPart(loadingApronThreshold, "camera_dock_camera_court_threshold_joint", "PAINTED_STEEL");
  for (const side of [-1, 1]) {
    const loadingApronCurb = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.18, 5.25, 4, 0.04), concrete);
    loadingApronCurb.position.set(cameraDockX + side * (dockWidth / 2 + 1.72), 0.29, cameraDockZ + 7.0);
    addPart(loadingApronCurb, `camera_dock_camera_court_apron_curb_${side < 0 ? "a" : "b"}`, "CONCRETE");
  }
  for (const stripeX of [cameraDockX - 5.8, cameraDockX + 5.8]) {
    const stripe = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.035, 5.1, 3, 0.02), warning);
    stripe.position.set(stripeX, 0.31, cameraDockZ + 3.0);
    addPart(stripe, "camera_dock_loading_lane_safety_stripe", "PAINTED_STEEL");
  }
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.28, dockHeight + 0.8, 0.28, 4, 0.05), steel);
    post.position.set(cameraDockX + side * (dockWidth / 2 + 1.25), (dockHeight + 0.8) / 2, cameraDockZ + 4.9);
    addPart(post, `camera_dock_hero_camera_bay_canopy_post_${side < 0 ? "a" : "b"}`, "GALVANIZED_STEEL");
    const bollard = new THREE.Mesh(new RoundedBoxGeometry(0.36, 1.05, 0.36, 4, 0.05), warning);
    bollard.position.set(cameraDockX + side * (dockWidth / 2 - 0.9), 0.53, cameraDockZ + 1.08);
    addPart(bollard, `camera_dock_safety_bollard_${side < 0 ? "a" : "b"}`, "PAINTED_STEEL");
    const brace = new THREE.Mesh(new RoundedBoxGeometry(0.18, 1.25, 0.18, 3, 0.035), steel);
    brace.position.set(cameraDockX + side * (dockWidth / 2 + 0.82), dockHeight - 0.05, cameraDockZ + 4.18);
    brace.rotation.z = side * 0.22;
    addPart(brace, `camera_dock_hero_camera_bay_canopy_brace_${side < 0 ? "a" : "b"}`, "GALVANIZED_STEEL");
  }
  const dockCanopy = new THREE.Mesh(new RoundedBoxGeometry(dockWidth + 3.2, 0.28, 3.2, 4, 0.06), roofMaterial);
  dockCanopy.position.set(cameraDockX, dockHeight + 0.55, cameraDockZ + 3.35);
  dockCanopy.rotation.x = -0.035;
  addPart(dockCanopy, "camera_dock_hero_camera_bay_loading_canopy", "GALVANIZED_STEEL");
  for (const lampX of [cameraDockX - 6.5, cameraDockX, cameraDockX + 6.5]) {
    const dockLamp = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.18, 0.32, 3, 0.04), light);
    dockLamp.position.set(lampX, dockHeight + 0.2, cameraDockZ + 0.46);
    addPart(dockLamp, "camera_dock_practical_wall_light", "PAINTED_STEEL");
  }
  const personnelFrame = new THREE.Mesh(new RoundedBoxGeometry(0.38, 2.75, 1.72, 4, 0.06), concrete);
  personnelFrame.position.set(-width * 0.28, 1.48, cameraDockZ + 0.36);
  addPart(personnelFrame, "utility_hall_personnel_door_frame", "CONCRETE");
  const personnelDoor = new THREE.Mesh(new RoundedBoxGeometry(0.16, 2.3, 1.14, 4, 0.04), darkSteel);
  personnelDoor.position.set(-width * 0.28, 1.36, cameraDockZ + 0.56);
  addPart(personnelDoor, "utility_hall_personnel_door", "PAINTED_STEEL");

  // Keep the utility hall as a real enclosed service room, but compact it and
  // step it behind the west loading elevation so it cannot occlude the bay row
  // from the locked player camera.
  const hallWidth = 8.8;
  const hallDepth = 6.4;
  const hallX = -width * 0.40;
  const hallZ = -record.size.z / 2 + 12.4;
  const hallBody = new THREE.Mesh(new RoundedBoxGeometry(hallWidth, 6.4, hallDepth, 5, 0.12), pressureMaterial(record, 0x4f5d59, 0.84, 0.28));
  hallBody.position.set(hallX, 3.2, hallZ);
  addPart(hallBody, "connected_utility_hall_full_depth_body", "PAINTED_STEEL");
  const hallRoof = new THREE.Mesh(new RoundedBoxGeometry(hallWidth + 1.6, 0.32, hallDepth + 1.1, 4, 0.08), roofMaterial);
  hallRoof.position.set(hallX, 6.56, hallZ);
  addPart(hallRoof, "connected_utility_hall_roof_termination", "GALVANIZED_STEEL");
  const hallDoor = new THREE.Mesh(new RoundedBoxGeometry(3.0, 4.45, 0.16, 4, 0.04), darkSteel);
  hallDoor.position.set(hallX + hallWidth * 0.22, 2.25, hallZ - hallDepth / 2 - 0.12);
  addPart(hallDoor, "connected_utility_hall_recessed_service_door", "PAINTED_STEEL");
  const hallDoorHeader = new THREE.Mesh(new RoundedBoxGeometry(3.48, 0.28, 0.34, 4, 0.04), steel);
  hallDoorHeader.position.set(hallDoor.position.x, 4.62, hallDoor.position.z - 0.08);
  addPart(hallDoorHeader, "connected_utility_hall_service_door_header", "GALVANIZED_STEEL");

  const stackZ = backZ + 2.2;
  const stackSpecs: Array<[number, number, number]> = [[-width * 0.03, 4.6, 1.28], [width * 0.13, 5.5, 1.05], [width * 0.27, 4.2, 1.4]];
  for (const [index, [stackX, stackHeight, radius]] of stackSpecs.entries()) {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, stackHeight, 20), tank);
    shell.position.set(stackX, stackHeight / 2, stackZ);
    addPart(shell, `connected_process_stack_tank_${index + 1}`, "PAINTED_STEEL");
    for (const ringY of [0.55, stackHeight - 0.55]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.98, 0.07, 8, 20), steel);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(stackX, ringY, stackZ);
      addPart(ring, `connected_process_stack_tank_band_${index + 1}`, "GALVANIZED_STEEL");
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.66, radius * 0.7, 0.18, 20), roofMaterial);
    cap.position.set(stackX, stackHeight + 0.08, stackZ);
    addPart(cap, `connected_process_stack_tank_cap_${index + 1}`, "GALVANIZED_STEEL");
  }
  const processBridge = new THREE.Mesh(new RoundedBoxGeometry(width * 0.62, 0.24, 0.28, 4, 0.05), steel);
  processBridge.position.set(width * 0.11, 6.1, stackZ + 0.42);
  addPart(processBridge, "connected_process_bridge_upper_run", "GALVANIZED_STEEL");
  for (const bridgeX of [-width * 0.15, width * 0.32]) {
    const support = new THREE.Mesh(new RoundedBoxGeometry(0.2, 5.6, 0.2, 3, 0.04), steel);
    support.position.set(bridgeX, 2.8, stackZ + 0.42);
    addPart(support, "connected_process_bridge_support", "GALVANIZED_STEEL");
  }
  const transferPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, width * 0.66, 14), steel);
  transferPipe.rotation.z = Math.PI / 2;
  transferPipe.position.set(width * 0.08, 4.15, stackZ + 0.52);
  addPart(transferPipe, "connected_process_transfer_pipe", "GALVANIZED_STEEL");

  const annexBase = new THREE.Mesh(new RoundedBoxGeometry(width * 0.23, 0.3, 8.6, 4, 0.06), concrete);
  annexBase.position.set(width * 0.42, 0.16, backZ + 2.9);
  addPart(annexBase, "intermediate_service_annex_grounded_base", "CONCRETE");
  const annexBody = new THREE.Mesh(new RoundedBoxGeometry(width * 0.22, 4.4, 8.0, 4, 0.1), pressureMaterial(record, 0x465452, 0.82, 0.34));
  annexBody.position.set(width * 0.42, 2.5, backZ + 2.9);
  addPart(annexBody, "intermediate_service_annex_full_depth_body", "PAINTED_STEEL");
  const annexRoof = new THREE.Mesh(new RoundedBoxGeometry(width * 0.24, 0.28, 8.6, 4, 0.06), roofMaterial);
  annexRoof.position.set(width * 0.42, 4.86, backZ + 2.9);
  addPart(annexRoof, "intermediate_service_annex_roof_termination", "GALVANIZED_STEEL");
}
