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
 * Presentation-only storm-drain channel attached to the camera route edge.
 * It is deliberately broad enough to read as infrastructure in the locked
 * evidence frame, while remaining separate from the frozen lane and cover
 * records.
 */
export function addPressurePlantCameraDrainChannel({
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
  group.name = "pressure_plant_camera_storm_drain_channel";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = "pressure_yard_camera_route_drain_channel";
  group.userData.supportClass = "GROUNDED";
  group.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    role: "camera_visible_grounded_storm_drain_channel_owner",
    materialFamily: "DRAINED_CONCRETE",
    presentationOnly: true,
  };

  const weatheredConcrete = (color: number, roughness: number, repeatX: number, repeatY: number, offsetX: number) => {
    const material = pressureMaterial(record, color, roughness, 0.035).clone();
    if (surfaceTexture) {
      const map = surfaceTexture.clone();
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(repeatX, repeatY);
      map.offset.set(offsetX, 0.12);
      map.needsUpdate = true;
      material.map = map;
      material.bumpMap = map.clone();
      material.bumpMap.wrapS = THREE.RepeatWrapping;
      material.bumpMap.wrapT = THREE.RepeatWrapping;
      material.bumpMap.repeat.copy(map.repeat);
      material.bumpMap.offset.copy(map.offset);
      material.bumpScale = 0.045;
      material.needsUpdate = true;
    }
    return material;
  };

  const shoulderMaterial = weatheredConcrete(0x777f78, 0.95, 2.4, 0.46, 0.19);
  const edgeMaterial = weatheredConcrete(0x9b9d91, 0.9, 3.1, 0.34, 0.41);
  const channelMaterial = pressureMaterial(record, 0x182526, 0.985, 0.12);
  const grateMaterial = pressureMaterial(record, 0x5d6964, 0.68, 0.72);
  const rustMaterial = pressureMaterial(record, 0x83543a, 0.82, 0.32);

  const add = (mesh: THREE.Mesh, role: string, materialFamily: string) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.hostId = record.id;
    mesh.userData.hostSocket = "pressure_yard_camera_route_drain_channel";
    mesh.userData.supportClass = "GROUNDED";
    mesh.userData.authoringRecord = {
      type: "pressure-plant-detail",
      ...record,
      role,
      materialFamily,
      presentationOnly: true,
      hostSocket: "pressure_yard_camera_route_drain_channel",
    };
    group.add(mesh);
  };

  const centers = [62, 82, 102, 122, 142, 162];
  const segmentWidth = 18.4;
  const channelZ = 80.15;
  for (const [index, x] of centers.entries()) {
    const shoulder = new THREE.Mesh(new RoundedBoxGeometry(segmentWidth - 0.18, 0.14, 0.36, 4, 0.035), shoulderMaterial);
    shoulder.position.set(x, 0.12, channelZ - 0.78);
    add(shoulder, `camera_route_drain_roadside_concrete_shoulder_${index + 1}`, "DRAINED_CONCRETE");

    const channel = new THREE.Mesh(new RoundedBoxGeometry(segmentWidth - 0.34, 0.12, 0.78, 4, 0.055), channelMaterial);
    channel.position.set(x, 0.07, channelZ);
    add(channel, `camera_route_recessed_storm_drain_channel_${index + 1}`, "DRAIN_CHANNEL");

    const farEdge = new THREE.Mesh(new RoundedBoxGeometry(segmentWidth - 0.18, 0.14, 0.3, 4, 0.035), edgeMaterial);
    farEdge.position.set(x, 0.12, channelZ + 0.52);
    add(farEdge, `camera_route_drain_far_concrete_edge_${index + 1}`, "DRAINED_CONCRETE");
  }

  for (const [index, x] of [72, 92, 112, 132, 152].entries()) {
    const frame = new THREE.Mesh(new RoundedBoxGeometry(2.35, 0.1, 0.92, 4, 0.035), grateMaterial);
    frame.position.set(x, 0.18, channelZ);
    add(frame, `camera_route_roadside_storm_grate_frame_${index + 1}`, "GALVANIZED_STEEL");
    for (const offset of [-0.78, -0.52, -0.26, 0, 0.26, 0.52, 0.78]) {
      const bar = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.075, 0.72, 3, 0.018), darkGrateMaterial(grateMaterial));
      bar.position.set(x + offset, 0.25, channelZ);
      add(bar, `camera_route_roadside_storm_grate_bar_${index + 1}`, "GALVANIZED_STEEL");
    }
    const rustTab = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.06, 0.08, 3, 0.018), rustMaterial);
    rustTab.position.set(x + 0.87, 0.27, channelZ - 0.34);
    add(rustTab, `camera_route_roadside_storm_grate_rust_tab_${index + 1}`, "OXIDIZED_STEEL");
  }

  root.add(group);
}

function darkGrateMaterial(source: THREE.MeshStandardMaterial) {
  const material = source.clone();
  material.color.multiplyScalar(0.78);
  material.roughness = 0.76;
  material.metalness = 0.76;
  material.needsUpdate = true;
  return material;
}
