import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PressurePlantSliceDetail } from "./pressure-plant-slice-details";

type PressureMaterialFactory = (
  record: PressurePlantSliceDetail,
  colorOverride?: number,
  roughnessOverride?: number,
  metalnessOverride?: number,
) => THREE.MeshStandardMaterial;

type AddPressureMesh = (mesh: THREE.Mesh, role: string, materialFamily?: string) => void;

export function addPlantWestServiceFrontage({
  record,
  leftX,
  steelMaterial,
  trimMaterial,
  loadingDoorMaterial,
  safetyBollardMaterial,
  pressureMaterial,
  add,
}: {
  record: PressurePlantSliceDetail;
  leftX: number;
  steelMaterial: THREE.Material;
  trimMaterial: THREE.Material;
  loadingDoorMaterial: THREE.Material;
  safetyBollardMaterial: THREE.Material;
  pressureMaterial: PressureMaterialFactory;
  add: AddPressureMesh;
}) {
  const dockConcrete = pressureMaterial(record, 0x85847a, 0.94, 0.06);
  const dockSteel = pressureMaterial(record, 0x344342, 0.62, 0.68);
  const dockDoor = pressureMaterial(record, 0x2d3d3d, 0.78, 0.34);
  const groundedPlinth = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.72, 136, 4, 0.08), dockConcrete);
  groundedPlinth.position.set(leftX - 0.08, 0.36, 0);
  add(groundedPlinth, "plant_west_service_continuous_grounded_plinth", "CONCRETE");
  for (const [index, supportZ] of [-58, -29, 0, 29, 58].entries()) {
    const supportPier = new THREE.Mesh(new RoundedBoxGeometry(2.2, 6.0, 8.4, 5, 0.14), pressureMaterial(record, 0x696e69, 0.92, 0.08));
    supportPier.position.set(leftX - 0.08, -2.98, supportZ);
    add(supportPier, `plant_west_service_ground_to_apron_support_pier_${index + 1}`, "CONCRETE");
    const supportFoot = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.18, 9.2, 4, 0.05), dockConcrete);
    supportFoot.position.set(leftX - 0.08, -5.98, supportZ);
    add(supportFoot, `plant_west_service_ground_support_foot_${index + 1}`, "CONCRETE");
  }
  for (const [index, infillZ] of [-43.5, -14.5, 14.5, 43.5].entries()) {
    const serviceInfill = new THREE.Mesh(new RoundedBoxGeometry(1.1, 4.6, 13.0, 4, 0.08), pressureMaterial(record, 0x394847, 0.84, 0.3));
    serviceInfill.position.set(leftX - 0.2, -2.65, infillZ);
    add(serviceInfill, `plant_west_service_grounded_undercroft_infill_${index + 1}`, "PAINTED_STEEL");
  }
  const serviceApron = new THREE.Mesh(new RoundedBoxGeometry(3.8, 0.16, 136, 4, 0.04), pressureMaterial(record, 0x5e625d, 0.92, 0.04));
  serviceApron.position.set(leftX - 1.85, 0.08, 0);
  add(serviceApron, "plant_west_service_continuous_dock_apron", "CONCRETE");
  const structuralPierMaterial = pressureMaterial(record, 0x3b4846, 0.68, 0.56);
  const structuralBaseMaterial = pressureMaterial(record, 0x70766d, 0.92, 0.08);
  for (const [index, structuralZ] of [-60, -30, 0, 30, 60].entries()) {
    const structuralPier = new THREE.Mesh(new RoundedBoxGeometry(1.1, 26.6, 0.78, 5, 0.1), structuralPierMaterial);
    structuralPier.position.set(leftX - 0.5, 13.3, structuralZ);
    add(structuralPier, `plant_west_service_structural_pilaster_${index + 1}`, "GALVANIZED_STEEL");
    const structuralFoot = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.22, 1.45, 4, 0.05), structuralBaseMaterial);
    structuralFoot.position.set(leftX - 1.0, 0.2, structuralZ);
    add(structuralFoot, `plant_west_service_structural_pilaster_foot_${index + 1}`, "CONCRETE");
  }
  const dockCenters = [-24, 24, 72];
  for (const [index, localZ] of dockCenters.entries()) {
    const dockPlatform = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.72, 12.8, 4, 0.08), dockConcrete);
    dockPlatform.position.set(leftX - 1.1, 0.36, localZ);
    add(dockPlatform, `plant_west_service_dock_platform_${index + 1}`, "CONCRETE");

    const dockDoorReveal = new THREE.Mesh(new RoundedBoxGeometry(0.46, 6.95, 11.65, 4, 0.08), pressureMaterial(record, 0x1f2b2b, 0.88, 0.22));
    dockDoorReveal.position.set(leftX - 0.78, 4.05, localZ);
    add(dockDoorReveal, `plant_west_service_dock_recessed_reveal_${index + 1}`, "PAINTED_STEEL");
    const dockDoorMesh = new THREE.Mesh(new RoundedBoxGeometry(0.18, 6.4, 10.8, 4, 0.05), dockDoor);
    dockDoorMesh.position.set(leftX - 1.04, 4.1, localZ);
    add(dockDoorMesh, `plant_west_service_dock_door_${index + 1}`, "PAINTED_STEEL");
    for (let rib = 0; rib < 6; rib += 1) {
      const doorRib = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.1, 10.1, 3, 0.025), dockSteel);
      doorRib.position.set(leftX - 0.86, 1.15 + rib * 1.05, localZ);
      add(doorRib, `plant_west_service_dock_door_rib_${index + 1}_${rib + 1}`, "GALVANIZED_STEEL");
    }
    const doorFrame = new THREE.Mesh(new RoundedBoxGeometry(0.5, 6.9, 11.9, 4, 0.08), trimMaterial);
    doorFrame.position.set(leftX - 0.5, 4.3, localZ);
    add(doorFrame, `plant_west_service_dock_frame_${index + 1}`, "CONCRETE");

    const dockCanopy = new THREE.Mesh(new RoundedBoxGeometry(8.4, 0.34, 13.2, 4, 0.07), steelMaterial);
    dockCanopy.position.set(leftX - 4.55, 7.6, localZ);
    dockCanopy.rotation.z = -0.025;
    add(dockCanopy, `plant_west_service_dock_canopy_${index + 1}`, "GALVANIZED_STEEL");
    for (const zOffset of [-5.35, 5.35]) {
      const canopyPost = new THREE.Mesh(new RoundedBoxGeometry(0.28, 6.6, 0.28, 4, 0.05), dockSteel);
      canopyPost.position.set(leftX - 8.3, 3.35, localZ + zOffset);
      add(canopyPost, `plant_west_service_dock_canopy_post_${index + 1}`, "GALVANIZED_STEEL");
    }

    for (const zOffset of [-5.5, 5.5]) {
      const bollard = new THREE.Mesh(new RoundedBoxGeometry(0.3, 1.15, 0.3, 4, 0.05), safetyBollardMaterial);
      bollard.position.set(leftX - 2.75, 0.58, localZ + zOffset);
      add(bollard, `plant_west_service_dock_bollard_${index + 1}`, "PAINTED_STEEL");
      const dockBumper = new THREE.Mesh(new RoundedBoxGeometry(0.28, 1.35, 0.48, 4, 0.06), pressureMaterial(record, 0x202927, 0.92, 0.08));
      dockBumper.position.set(leftX - 3.55, 1.0, localZ + zOffset * 0.82);
      add(dockBumper, `plant_west_service_dock_rubber_bumper_${index + 1}_${zOffset < 0 ? "a" : "b"}`, "RUBBER");
    }
    const stairTop = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.18, 2.8, 4, 0.04), dockConcrete);
    stairTop.position.set(leftX - 2.1, 0.82, localZ + 5.0);
    add(stairTop, `plant_west_service_dock_stair_landing_${index + 1}`, "CONCRETE");
    for (let step = 0; step < 3; step += 1) {
      const dockStep = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.22, 0.72, 4, 0.04), dockConcrete);
      dockStep.position.set(leftX - 2.1, 0.11 + step * 0.22, localZ + 6.45 + step * 0.62);
      add(dockStep, `plant_west_service_dock_step_${index + 1}_${step + 1}`, "CONCRETE");
    }
    for (const side of [-1, 1]) {
      const railPost = new THREE.Mesh(new RoundedBoxGeometry(0.16, 1.28, 0.16, 3, 0.03), dockSteel);
      railPost.position.set(leftX - 2.1 + side * 0.82, 0.72, localZ + 5.95);
      add(railPost, `plant_west_service_dock_rail_post_${index + 1}_${side}`, "GALVANIZED_STEEL");
      const rail = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.16, 2.55, 3, 0.03), dockSteel);
      rail.position.set(leftX - 2.1 + side * 0.82, 1.22, localZ + 6.55);
      rail.rotation.x = -0.08;
      add(rail, `plant_west_service_dock_handrail_${index + 1}_${side}`, "GALVANIZED_STEEL");
    }
    const serviceLamp = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.18, 0.28, 3, 0.04), new THREE.MeshStandardMaterial({ color: 0xffd29b, emissive: 0x77441f, emissiveIntensity: 0.72, roughness: 0.32, metalness: 0.06 }));
    serviceLamp.position.set(leftX - 1.4, 7.18, localZ - 5.3);
    add(serviceLamp, `plant_west_service_dock_light_${index + 1}`, "PAINTED_STEEL");

    const downpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 6.75, 10), dockSteel);
    downpipe.position.set(leftX - 1.34, 3.45, localZ + 6.0);
    add(downpipe, `plant_west_service_dock_downpipe_${index + 1}`, "GALVANIZED_STEEL");
    const pipeFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.48, 10), dockSteel);
    pipeFoot.position.set(leftX - 1.34, 0.28, localZ + 6.0);
    add(pipeFoot, `plant_west_service_dock_downpipe_foot_${index + 1}`, "GALVANIZED_STEEL");
  }

  const personnelDoorFrame = new THREE.Mesh(new RoundedBoxGeometry(0.38, 2.75, 1.62, 4, 0.06), trimMaterial);
  personnelDoorFrame.position.set(leftX - 0.86, 1.58, 48);
  add(personnelDoorFrame, "plant_west_service_personnel_door_frame", "CONCRETE");
  const personnelDoor = new THREE.Mesh(new RoundedBoxGeometry(0.16, 2.28, 1.08, 4, 0.04), dockDoor);
  personnelDoor.position.set(leftX - 1.08, 1.38, 48);
  add(personnelDoor, "plant_west_service_personnel_door", "PAINTED_STEEL");
  const personnelHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 8), dockSteel);
  personnelHandle.rotation.z = Math.PI / 2;
  personnelHandle.position.set(leftX - 1.22, 1.38, 48.28);
  add(personnelHandle, "plant_west_service_personnel_door_handle", "GALVANIZED_STEEL");

  const serviceCabinet = new THREE.Mesh(new RoundedBoxGeometry(0.34, 1.34, 1.05, 4, 0.06), dockSteel);
  serviceCabinet.position.set(leftX - 1.02, 2.1, 57.5);
  add(serviceCabinet, "plant_west_service_electrical_cabinet", "GALVANIZED_STEEL");
  const cabinetFace = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.72, 0.7, 3, 0.02), safetyBollardMaterial);
  cabinetFace.position.set(leftX - 1.23, 2.1, 57.5);
  add(cabinetFace, "plant_west_service_electrical_cabinet_face", "PAINTED_STEEL");

  const cameraBayZ = -18;
  const cameraBayPlatform = new THREE.Mesh(new RoundedBoxGeometry(9.0, 0.62, 15.0, 4, 0.08), dockConcrete);
  cameraBayPlatform.position.set(leftX - 4.8, 0.34, cameraBayZ);
  add(cameraBayPlatform, "plant_west_camera_visible_service_bay_platform", "CONCRETE");
  const cameraBayReveal = new THREE.Mesh(new RoundedBoxGeometry(0.62, 7.2, 13.3, 4, 0.09), pressureMaterial(record, 0x172423, 0.9, 0.2));
  cameraBayReveal.position.set(leftX - 0.86, 4.25, cameraBayZ);
  add(cameraBayReveal, "plant_west_camera_visible_service_bay_reveal", "PAINTED_STEEL");
  const cameraBayDoor = new THREE.Mesh(new RoundedBoxGeometry(0.18, 6.65, 11.7, 4, 0.05), dockDoor);
  cameraBayDoor.position.set(leftX - 1.2, 4.1, cameraBayZ);
  add(cameraBayDoor, "plant_west_camera_visible_service_bay_door", "PAINTED_STEEL");
  for (const localZ of [cameraBayZ - 6.0, cameraBayZ + 6.0]) {
    const cameraBayBumper = new THREE.Mesh(new RoundedBoxGeometry(0.32, 1.5, 0.5, 4, 0.06), pressureMaterial(record, 0x202927, 0.92, 0.08));
    cameraBayBumper.position.set(leftX - 3.8, 1.05, localZ);
    add(cameraBayBumper, `plant_west_camera_visible_service_bay_bumper_${localZ < cameraBayZ ? "a" : "b"}`, "RUBBER");
  }
  const cameraBayCanopy = new THREE.Mesh(new RoundedBoxGeometry(14.0, 0.34, 15.0, 4, 0.07), steelMaterial);
  cameraBayCanopy.position.set(leftX - 7.2, 7.85, cameraBayZ);
  cameraBayCanopy.rotation.z = -0.025;
  add(cameraBayCanopy, "plant_west_camera_visible_service_bay_canopy", "GALVANIZED_STEEL");
  for (const localZ of [cameraBayZ - 6.35, cameraBayZ + 6.35]) {
    const cameraBayPost = new THREE.Mesh(new RoundedBoxGeometry(0.28, 6.8, 0.28, 4, 0.05), dockSteel);
    cameraBayPost.position.set(leftX - 14.0, 3.55, localZ);
    add(cameraBayPost, `plant_west_camera_visible_service_bay_post_${localZ < cameraBayZ ? "a" : "b"}`, "GALVANIZED_STEEL");
  }
  const cameraBayInterior = new THREE.Mesh(new RoundedBoxGeometry(0.28, 7.45, 12.65, 4, 0.06), new THREE.MeshStandardMaterial({ color: 0x0b1414, roughness: 0.96, metalness: 0.08 }));
  cameraBayInterior.position.set(leftX - 2.18, 4.12, cameraBayZ);
  add(cameraBayInterior, "plant_west_camera_visible_service_bay_deep_interior", "PAINTED_STEEL");
  for (const [side, localZ] of [["a", cameraBayZ - 6.95], ["b", cameraBayZ + 6.95]] as const) {
    const bayReturn = new THREE.Mesh(new RoundedBoxGeometry(3.25, 7.7, 0.52, 4, 0.08), dockSteel);
    bayReturn.position.set(leftX - 2.0, 4.08, localZ);
    add(bayReturn, `plant_west_camera_visible_service_bay_projecting_jamb_return_${side}`, "GALVANIZED_STEEL");
    const returnCap = new THREE.Mesh(new RoundedBoxGeometry(3.5, 0.32, 0.72, 4, 0.06), trimMaterial);
    returnCap.position.set(leftX - 3.72, 7.82, localZ);
    add(returnCap, `plant_west_camera_visible_service_bay_jamb_return_cap_${side}`, "GALVANIZED_STEEL");
  }
  const cameraBayThreshold = new THREE.Mesh(new RoundedBoxGeometry(8.3, 0.18, 14.4, 4, 0.04), dockConcrete);
  cameraBayThreshold.position.set(leftX - 5.0, 0.71, cameraBayZ);
  add(cameraBayThreshold, "plant_west_camera_visible_service_bay_threshold_apron", "CONCRETE");
  const cameraBayPersonnelFrame = new THREE.Mesh(new RoundedBoxGeometry(0.4, 2.85, 1.8, 4, 0.06), trimMaterial);
  cameraBayPersonnelFrame.position.set(leftX - 1.02, 1.58, cameraBayZ + 9.25);
  add(cameraBayPersonnelFrame, "plant_west_camera_visible_service_bay_personnel_door_frame", "CONCRETE");
  const cameraBayPersonnelDoor = new THREE.Mesh(new RoundedBoxGeometry(0.16, 2.38, 1.18, 4, 0.04), new THREE.MeshStandardMaterial({ color: 0x182323, roughness: 0.9, metalness: 0.2 }));
  cameraBayPersonnelDoor.position.set(leftX - 1.24, 1.36, cameraBayZ + 9.25);
  add(cameraBayPersonnelDoor, "plant_west_camera_visible_service_bay_personnel_door", "PAINTED_STEEL");
  const cameraBayPersonnelHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 8), dockSteel);
  cameraBayPersonnelHandle.rotation.z = Math.PI / 2;
  cameraBayPersonnelHandle.position.set(leftX - 1.38, 1.38, cameraBayZ + 9.52);
  add(cameraBayPersonnelHandle, "plant_west_camera_visible_service_bay_personnel_door_handle", "GALVANIZED_STEEL");
  const cameraBayLamp = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.2, 0.3, 3, 0.04), new THREE.MeshStandardMaterial({ color: 0xffd29b, emissive: 0x77441f, emissiveIntensity: 0.82, roughness: 0.3, metalness: 0.06 }));
  cameraBayLamp.position.set(leftX - 1.65, 7.25, cameraBayZ - 5.2);
  add(cameraBayLamp, "plant_west_camera_visible_service_bay_light", "PAINTED_STEEL");

  const westCameraBayConcrete = pressureMaterial(record, 0x8b887c, 0.92, 0.06);
  const westCameraBaySteel = pressureMaterial(record, 0x2f3e3c, 0.58, 0.68);
  const westCameraBayDoor = pressureMaterial(record, 0x1a2928, 0.9, 0.2);
  for (const [index, westBayZ] of [-48, -22].entries()) {
    const bayPlatform = new THREE.Mesh(new RoundedBoxGeometry(5.4, 0.68, 13.6, 4, 0.08), westCameraBayConcrete);
    bayPlatform.position.set(leftX - 2.9, 0.34, westBayZ);
    add(bayPlatform, `plant_west_camera_bay_${index + 1}_grounded_platform`, "CONCRETE");
    const bayReveal = new THREE.Mesh(new RoundedBoxGeometry(0.62, 7.9, 12.3, 4, 0.1), westCameraBayDoor);
    bayReveal.position.set(leftX - 0.82, 4.18, westBayZ);
    add(bayReveal, `plant_west_camera_bay_${index + 1}_recessed_door_reveal`, "PAINTED_STEEL");
    const bayDoorFrame = new THREE.Mesh(new RoundedBoxGeometry(0.5, 8.3, 13.0, 4, 0.08), trimMaterial);
    bayDoorFrame.position.set(leftX - 0.5, 4.3, westBayZ);
    add(bayDoorFrame, `plant_west_camera_bay_${index + 1}_door_frame`, "CONCRETE");
    for (let rib = 0; rib < 6; rib += 1) {
      const ribMesh = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.1, 11.4, 3, 0.025), westCameraBaySteel);
      ribMesh.position.set(leftX - 1.08, 1.3 + rib * 1.12, westBayZ);
      add(ribMesh, `plant_west_camera_bay_${index + 1}_door_rib_${rib + 1}`, "GALVANIZED_STEEL");
    }
    const bayCanopy = new THREE.Mesh(new RoundedBoxGeometry(7.8, 0.34, 14.3, 4, 0.07), westCameraBaySteel);
    bayCanopy.position.set(leftX - 4.0, 7.85, westBayZ);
    add(bayCanopy, `plant_west_camera_bay_${index + 1}_canopy`, "GALVANIZED_STEEL");
    for (const side of [-1, 1]) {
      const bayPost = new THREE.Mesh(new RoundedBoxGeometry(0.32, 6.9, 0.32, 4, 0.05), westCameraBaySteel);
      bayPost.position.set(leftX - 7.3, 3.45, westBayZ + side * 5.8);
      add(bayPost, `plant_west_camera_bay_${index + 1}_canopy_post_${side < 0 ? "a" : "b"}`, "GALVANIZED_STEEL");
      const bayBollard = new THREE.Mesh(new RoundedBoxGeometry(0.36, 1.2, 0.36, 4, 0.05), safetyBollardMaterial);
      bayBollard.position.set(leftX - 3.7, 0.6, westBayZ + side * 5.2);
      add(bayBollard, `plant_west_camera_bay_${index + 1}_bollard_${side < 0 ? "a" : "b"}`, "PAINTED_STEEL");
      const bayBumper = new THREE.Mesh(new RoundedBoxGeometry(0.3, 1.3, 0.5, 4, 0.06), westCameraBaySteel);
      bayBumper.position.set(leftX - 4.25, 1.0, westBayZ + side * 4.6);
      add(bayBumper, `plant_west_camera_bay_${index + 1}_rubber_bumper_${side < 0 ? "a" : "b"}`, "RUBBER");
    }
    const bayLamp = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.2, 0.3, 3, 0.04), new THREE.MeshStandardMaterial({ color: 0xffd19b, emissive: 0x77431f, emissiveIntensity: 0.78, roughness: 0.3, metalness: 0.06 }));
    bayLamp.position.set(leftX - 1.5, 7.3, westBayZ - 5.2);
    add(bayLamp, `plant_west_camera_bay_${index + 1}_service_light`, "PAINTED_STEEL");
  }

  const heroBayZ = -39.0;
  const heroBayPlatform = new THREE.Mesh(new RoundedBoxGeometry(8.2, 0.72, 20.0, 5, 0.1), westCameraBayConcrete);
  heroBayPlatform.position.set(leftX - 4.2, 0.36, heroBayZ);
  add(heroBayPlatform, "plant_west_hero_camera_bay_grounded_platform", "CONCRETE");
  const heroBayApron = new THREE.Mesh(new RoundedBoxGeometry(12.2, 0.18, 23.2, 5, 0.06), westCameraBayConcrete);
  heroBayApron.position.set(leftX - 6.1, 0.83, heroBayZ);
  add(heroBayApron, "plant_west_hero_camera_bay_full_depth_service_apron", "CONCRETE");
  const heroBayReveal = new THREE.Mesh(new RoundedBoxGeometry(0.72, 9.4, 18.8, 4, 0.12), westCameraBayDoor);
  heroBayReveal.position.set(leftX - 0.95, 4.75, heroBayZ);
  add(heroBayReveal, "plant_west_hero_camera_bay_recessed_dark_opening", "PAINTED_STEEL");
  const heroBayInterior = new THREE.Mesh(new RoundedBoxGeometry(0.16, 8.8, 17.6, 4, 0.04), new THREE.MeshStandardMaterial({ color: 0x101a1a, roughness: 0.94, metalness: 0.12 }));
  heroBayInterior.position.set(leftX - 3.65, 4.55, heroBayZ);
  add(heroBayInterior, "plant_west_hero_camera_bay_deep_interior_shadow", "PAINTED_STEEL");
  const heroBayThreshold = new THREE.Mesh(new RoundedBoxGeometry(5.4, 0.22, 17.9, 4, 0.04), westCameraBayConcrete);
  heroBayThreshold.position.set(leftX - 2.8, 0.84, heroBayZ);
  add(heroBayThreshold, "plant_west_hero_camera_bay_threshold_lip", "CONCRETE");
  const heroBayFrame = new THREE.Mesh(new RoundedBoxGeometry(0.56, 9.9, 19.6, 4, 0.1), trimMaterial);
  heroBayFrame.position.set(leftX - 0.54, 4.9, heroBayZ);
  add(heroBayFrame, "plant_west_hero_camera_bay_frame", "CONCRETE");
  for (let rib = 0; rib < 7; rib += 1) {
    const heroRib = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.11, 17.5, 3, 0.025), westCameraBaySteel);
    heroRib.position.set(leftX - 1.3, 1.3 + rib * 1.2, heroBayZ);
    add(heroRib, `plant_west_hero_camera_bay_door_rib_${rib + 1}`, "GALVANIZED_STEEL");
  }
  const heroBayCanopy = new THREE.Mesh(new RoundedBoxGeometry(12.0, 0.38, 21.0, 4, 0.08), westCameraBaySteel);
  heroBayCanopy.position.set(leftX - 6.0, 8.8, heroBayZ);
  add(heroBayCanopy, "plant_west_hero_camera_bay_deep_canopy", "GALVANIZED_STEEL");
  for (const side of [-1, 1]) {
    const heroPost = new THREE.Mesh(new RoundedBoxGeometry(0.34, 7.6, 0.34, 4, 0.06), westCameraBaySteel);
    heroPost.position.set(leftX - 11.2, 3.8, heroBayZ + side * 8.2);
    add(heroPost, `plant_west_hero_camera_bay_canopy_post_${side < 0 ? "a" : "b"}`, "GALVANIZED_STEEL");
    const heroBollard = new THREE.Mesh(new RoundedBoxGeometry(0.4, 1.25, 0.4, 4, 0.06), safetyBollardMaterial);
    heroBollard.position.set(leftX - 5.0, 0.64, heroBayZ + side * 7.5);
    add(heroBollard, `plant_west_hero_camera_bay_bollard_${side < 0 ? "a" : "b"}`, "PAINTED_STEEL");
  }
  // Secondary dock access is presentation-only. The canonical 30-rise stair below
  // remains unchanged; this shorter flight simply makes the camera-facing loading
  // court physically explain its raised service platform.
  const heroAccessConcrete = pressureMaterial(record, 0x85847a, 0.94, 0.06);
  const heroAccessSteel = pressureMaterial(record, 0x344342, 0.62, 0.68);
  const heroAccessStartX = leftX - 16.0;
  const heroAccessRun = 8.0;
  const heroAccessRise = 0.5;
  const heroAccessZ = heroBayZ + 8.0;
  for (let step = 0; step < 12; step += 1) {
    const tread = new THREE.Mesh(new RoundedBoxGeometry(heroAccessRun / 12 + 0.08, heroAccessRise, 4.6, 4, 0.045), heroAccessConcrete);
    tread.position.set(heroAccessStartX + (step + 0.5) * heroAccessRun / 12, -6.0 + (step + 0.5) * heroAccessRise, heroAccessZ);
    add(tread, `plant_west_hero_dock_access_step_${step + 1}`, "CONCRETE");
  }
  for (const side of [-1, 1]) {
    const railZ = heroAccessZ + side * 2.58;
    const railPostLow = new THREE.Mesh(new RoundedBoxGeometry(0.2, 1.6, 0.2, 3, 0.035), heroAccessSteel);
    railPostLow.position.set(heroAccessStartX + 0.9, -5.2, railZ);
    add(railPostLow, `plant_west_hero_dock_access_rail_low_${side < 0 ? "a" : "b"}`, "GALVANIZED_STEEL");
    const railPostHigh = new THREE.Mesh(new RoundedBoxGeometry(0.2, 1.6, 0.2, 3, 0.035), heroAccessSteel);
    railPostHigh.position.set(heroAccessStartX + heroAccessRun - 0.9, 0.8, railZ);
    add(railPostHigh, `plant_west_hero_dock_access_rail_high_${side < 0 ? "a" : "b"}`, "GALVANIZED_STEEL");
    const rail = new THREE.Mesh(new RoundedBoxGeometry(heroAccessRun, 0.18, 0.18, 3, 0.035), heroAccessSteel);
    rail.position.set(heroAccessStartX + heroAccessRun / 2, -2.2, railZ);
    rail.rotation.z = Math.atan2(6.0, heroAccessRun);
    add(rail, `plant_west_hero_dock_access_handrail_${side < 0 ? "a" : "b"}`, "GALVANIZED_STEEL");
  }
  const heroWallPackMaterial = new THREE.MeshStandardMaterial({ color: 0xffd6a0, emissive: 0x78451f, emissiveIntensity: 1.0, roughness: 0.28, metalness: 0.06 });
  for (const zOffset of [-6.2, 6.2]) {
    const heroWallPack = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.72, 1.15, 3, 0.06), heroWallPackMaterial);
    heroWallPack.position.set(leftX - 1.2, 6.9, heroBayZ + zOffset);
    add(heroWallPack, "plant_west_hero_camera_bay_wall_pack", "PAINTED_STEEL");
  }

  const serviceStairConcrete = pressureMaterial(record, 0x85847a, 0.94, 0.06);
  const serviceStairSteel = pressureMaterial(record, 0x344342, 0.62, 0.68);
  const stairWidth = 8.0;
  const stairRun = 14.0;
  const stairRise = 0.2;
  const stairStartX = leftX - 17.0;
  for (let step = 0; step < 30; step += 1) {
    const tread = new THREE.Mesh(new RoundedBoxGeometry(stairRun / 30 + 0.06, stairRise, stairWidth, 4, 0.045), serviceStairConcrete);
    tread.position.set(stairStartX + (step + 0.5) * (stairRun / 30), -6.0 + (step + 0.5) * stairRise, cameraBayZ);
    add(tread, `plant_west_camera_visible_service_stair_rise_${step + 1}`, "CONCRETE");
  }
  for (const side of [-1, 1]) {
    const railZ = cameraBayZ + side * (stairWidth / 2 + 0.36);
    for (const [postIndex, xOffset] of [1.2, stairRun - 1.2].entries()) {
      const railPost = new THREE.Mesh(new RoundedBoxGeometry(0.18, 6.3, 0.18, 3, 0.03), serviceStairSteel);
      railPost.position.set(stairStartX + xOffset, -2.4 + (xOffset / stairRun) * 6.0, railZ);
      add(railPost, `plant_west_camera_visible_service_stair_rail_post_${side < 0 ? "a" : "b"}_${postIndex + 1}`, "GALVANIZED_STEEL");
    }
    const rail = new THREE.Mesh(new RoundedBoxGeometry(stairRun, 0.16, 0.16, 3, 0.03), serviceStairSteel);
    rail.position.set(stairStartX + stairRun / 2, -1.6, railZ);
    rail.rotation.z = Math.atan2(6.0, stairRun);
    add(rail, `plant_west_camera_visible_service_stair_handrail_${side < 0 ? "a" : "b"}`, "GALVANIZED_STEEL");
  }
  const stairGroundLanding = new THREE.Mesh(new RoundedBoxGeometry(4.4, 0.18, stairWidth + 1.0, 4, 0.04), serviceStairConcrete);
  stairGroundLanding.position.set(stairStartX - 1.9, -5.95, cameraBayZ);
  add(stairGroundLanding, "plant_west_camera_visible_service_stair_ground_landing", "CONCRETE");
}
