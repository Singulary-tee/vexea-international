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
 * Large camera-visible loading-bay band on the plant's west wall. It is
 * presentation-only and deliberately sits below the retained process catwalk,
 * using real recesses, thresholds, access steps, railings, and service lights
 * to make the facade read as occupied industrial space rather than as a prop
 * scatter. Frozen shell, route, cover, stair, ramp, and zone truth is untouched.
 */
export function addPressurePlantCameraLoadingBays({
  root,
  record,
  pressureMaterial,
}: {
  root: THREE.Group;
  record: PressurePlantSliceDetail;
  pressureMaterial: PressureMaterialFactory;
}) {
  const group = new THREE.Group();
  group.name = "pressure_plant_camera_loading_bays";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = "image_plant_building_south_service_frame";
  group.userData.supportClass = "SUPPORTED";
  group.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    role: "camera_visible_large_west_facade_loading_bay_band",
    materialFamily: "PAINTED_STEEL",
    visualHostOffset: { x: -67.1, y: 0, z: 24 },
  };

  const wallX = 149.05;
  const outwardX = 145.0;
  // Projection sweep: this is the visible west-wall interval. The previous
  // 52–84 m placement sat behind the low-shed/catwalk overlap and did not read.
  const centers = [-38.0, -10.0, 18.0];
  const bayWidth = 15.8;
  const bayBottom = 0.72;
  const doorHeight = 9.9;
  const doorCenterY = bayBottom + doorHeight / 2;
  const dark = pressureMaterial(record, 0x172424, 0.92, 0.2);
  const doorMetal = pressureMaterial(record, 0x445450, 0.72, 0.48);
  const trim = pressureMaterial(record, 0x858a80, 0.82, 0.22);
  const steel = pressureMaterial(record, 0x344442, 0.6, 0.68);
  const apron = pressureMaterial(record, 0x85867d, 0.95, 0.045);
  const rubber = pressureMaterial(record, 0x252d2c, 0.93, 0.05);
  const safety = new THREE.MeshStandardMaterial({ color: 0xa77442, roughness: 0.8, metalness: 0.12 });
  const warm = new THREE.MeshStandardMaterial({ color: 0xffcb91, emissive: 0x75431e, emissiveIntensity: 0.78, roughness: 0.3, metalness: 0.05 });

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

  for (const [index, z] of centers.entries()) {
    const reveal = new THREE.Mesh(new RoundedBoxGeometry(0.38, doorHeight + 0.7, bayWidth + 0.8, 4, 0.08), dark);
    reveal.position.set(wallX - 0.26, doorCenterY, z);
    add(reveal, `camera_loading_bay_${index + 1}_deep_recess`, "PAINTED_STEEL");

    const door = new THREE.Mesh(new RoundedBoxGeometry(0.14, doorHeight, bayWidth - 0.75, 4, 0.035), doorMetal);
    door.position.set(wallX - 0.52, doorCenterY, z);
    add(door, `camera_loading_bay_${index + 1}_rolling_door`, "PAINTED_STEEL");
    for (let rib = 0; rib < 7; rib += 1) {
      const ribMesh = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.09, bayWidth - 1.2, 3, 0.02), steel);
      ribMesh.position.set(wallX - 0.63, 1.3 + rib * 1.14, z);
      add(ribMesh, `camera_loading_bay_${index + 1}_rolling_door_rib_${rib + 1}`, "GALVANIZED_STEEL");
    }

    const frameLeft = new THREE.Mesh(new RoundedBoxGeometry(0.46, doorHeight + 0.8, 0.48, 4, 0.07), trim);
    frameLeft.position.set(wallX - 0.78, doorCenterY, z - bayWidth / 2 - 0.1);
    add(frameLeft, `camera_loading_bay_${index + 1}_frame_left`, "CONCRETE");
    const frameRight = frameLeft.clone();
    frameRight.position.z = z + bayWidth / 2 + 0.1;
    frameRight.userData = { ...frameLeft.userData, authoringRecord: { type: "pressure-plant-detail", ...record, role: `camera_loading_bay_${index + 1}_frame_right`, materialFamily: "CONCRETE", presentationOnly: true } };
    group.add(frameRight);
    const header = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.52, bayWidth + 1.0, 4, 0.07), trim);
    header.position.set(wallX - 0.78, bayBottom + doorHeight + 0.35, z);
    add(header, `camera_loading_bay_${index + 1}_header`, "CONCRETE");

    const platform = new THREE.Mesh(new RoundedBoxGeometry(wallX - outwardX + 0.9, 0.48, bayWidth + 1.0, 4, 0.075), apron);
    platform.position.set((wallX + outwardX) / 2, 0.24, z);
    add(platform, `camera_loading_bay_${index + 1}_grounded_loading_platform`, "CONCRETE");
    const bumperNear = new THREE.Mesh(new RoundedBoxGeometry(0.36, 1.2, 0.42, 4, 0.06), rubber);
    bumperNear.position.set(outwardX + 0.2, 0.78, z - bayWidth / 2 + 0.55);
    add(bumperNear, `camera_loading_bay_${index + 1}_rubber_bumper_near`, "RUBBER");
    const bumperFar = bumperNear.clone();
    bumperFar.position.z = z + bayWidth / 2 - 0.55;
    bumperFar.userData = { ...bumperNear.userData, authoringRecord: { type: "pressure-plant-detail", ...record, role: `camera_loading_bay_${index + 1}_rubber_bumper_far`, materialFamily: "RUBBER", presentationOnly: true } };
    group.add(bumperFar);

    for (let step = 0; step < 3; step += 1) {
      const tread = new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.2, 2.25, 4, 0.04), apron);
      tread.position.set(outwardX - 1.0 - step * 0.65, 0.62 + step * 0.2, z + bayWidth / 2 + 1.45 + step * 0.3);
      add(tread, `camera_loading_bay_${index + 1}_access_step_${step + 1}`, "CONCRETE");
    }
    for (const side of [-1, 1]) {
      const railPost = new THREE.Mesh(new RoundedBoxGeometry(0.14, 1.0, 0.14, 3, 0.025), steel);
      railPost.position.set(outwardX - 1.7, 1.12, z + side * (bayWidth / 2 + 1.25));
      add(railPost, `camera_loading_bay_${index + 1}_access_rail_post_${side < 0 ? "near" : "far"}`, "GALVANIZED_STEEL");
    }
    const accessRail = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.14, 2.85, 3, 0.025), steel);
    accessRail.position.set(outwardX - 1.7, 1.58, z + bayWidth / 2 + 1.45);
    accessRail.rotation.y = 0.1;
    add(accessRail, `camera_loading_bay_${index + 1}_access_handrail`, "GALVANIZED_STEEL");

    const canopy = new THREE.Mesh(new RoundedBoxGeometry(3.9, 0.32, bayWidth + 1.3, 4, 0.065), steel);
    canopy.position.set(outwardX - 1.7, 10.55, z);
    canopy.rotation.x = -0.035;
    add(canopy, `camera_loading_bay_${index + 1}_weather_canopy`, "GALVANIZED_STEEL");
    for (const side of [-1, 1]) {
      const canopyPost = new THREE.Mesh(new RoundedBoxGeometry(0.24, 9.2, 0.24, 4, 0.045), steel);
      canopyPost.position.set(outwardX - 3.35, 5.0, z + side * (bayWidth / 2 + 0.45));
      add(canopyPost, `camera_loading_bay_${index + 1}_canopy_post_${side < 0 ? "near" : "far"}`, "GALVANIZED_STEEL");
      const bollard = new THREE.Mesh(new RoundedBoxGeometry(0.3, 1.2, 0.3, 4, 0.05), safety);
      bollard.position.set(outwardX - 1.45, 0.6, z + side * (bayWidth / 2 + 0.6));
      add(bollard, `camera_loading_bay_${index + 1}_safety_bollard_${side < 0 ? "near" : "far"}`);
    }

    const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.64, 0.92, 3, 0.06), warm);
    lamp.position.set(wallX - 1.08, 9.35, z - bayWidth / 2 + 1.25);
    add(lamp, `camera_loading_bay_${index + 1}_service_lamp`);
    const point = new THREE.PointLight(0xffa468, 4.0, 12.0, 2.0);
    point.position.set(wallX - 1.5, 7.4, z - bayWidth / 2 + 1.25);
    point.userData.pressurePlantSlice = true;
    point.userData.pressurePlantDetailId = record.id;
    point.userData.presentationOnly = true;
    point.userData.hostId = record.id;
    point.userData.hostSocket = "image_plant_building_south_service_frame";
    point.userData.supportClass = "SUPPORTED";
    point.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: `camera_loading_bay_${index + 1}_warm_practical`, materialFamily: "LIGHTING", presentationOnly: true };
    group.add(point);

    const downpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 8.5, 12), steel);
    downpipe.position.set(wallX - 0.98, 4.55, z + bayWidth / 2 + 0.2);
    add(downpipe, `camera_loading_bay_${index + 1}_downpipe`, "GALVANIZED_STEEL");
    const drainFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.44, 12), steel);
    drainFoot.position.set(wallX - 0.98, 0.34, z + bayWidth / 2 + 0.2);
    add(drainFoot, `camera_loading_bay_${index + 1}_downpipe_foot`, "GALVANIZED_STEEL");
  }

  const bandTop = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.32, 50.0, 4, 0.05), trim);
  bandTop.position.set(wallX - 0.72, 12.22, -10.0);
  add(bandTop, "camera_loading_bay_band_upper_trim", "CONCRETE");
  root.add(group);
}
