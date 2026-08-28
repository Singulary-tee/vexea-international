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
 * Broad camera-visible service hardstand. Its irregular outline gives the
 * pressure lane a deliberate concrete work surface rather than another
 * infinite rectangle. It is presentation-only, grounded at the existing road
 * datum, and not a gameplay cover or route replacement.
 */
export function addPressurePlantCameraServiceHardstand({
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
  group.name = "pressure_plant_camera_service_hardstand";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = "pressure_yard_camera_route_edge";
  group.userData.supportClass = "GROUNDED";
  group.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    role: "camera_visible_irregular_service_hardstand_ground_hierarchy",
    materialFamily: "CONCRETE",
  };

  const baseTexture = surfaceTexture?.clone();
  if (baseTexture) {
    baseTexture.wrapS = THREE.RepeatWrapping;
    baseTexture.wrapT = THREE.RepeatWrapping;
    baseTexture.repeat.set(3.2, 1.0);
    baseTexture.offset.set(0.13, 0.22);
    baseTexture.needsUpdate = true;
  }
  const concrete = pressureMaterial(record, 0x7a817a, 0.95, 0.035).clone();
  if (baseTexture) {
    concrete.map = baseTexture;
    concrete.bumpMap = baseTexture.clone();
    concrete.bumpMap.wrapS = THREE.RepeatWrapping;
    concrete.bumpMap.wrapT = THREE.RepeatWrapping;
    concrete.bumpMap.repeat.copy(baseTexture.repeat);
    concrete.bumpMap.offset.copy(baseTexture.offset);
    concrete.bumpScale = 0.065;
    concrete.needsUpdate = true;
  }
  concrete.userData = { sourceAsset: "procedural_pressure_plant_concrete_v2", semanticSurface: "camera_service_hardstand" };
  const edgeConcrete = pressureMaterial(record, 0x8a8e84, 0.94, 0.045);
  const joint = pressureMaterial(record, 0x303a39, 0.98, 0.015);
  const gutter = pressureMaterial(record, 0x1f2929, 0.98, 0.18);
  const steel = pressureMaterial(record, 0x5c6862, 0.68, 0.64);
  const marking = new THREE.MeshStandardMaterial({ color: 0x9b7144, roughness: 0.84, metalness: 0.08 });

  const add = (mesh: THREE.Mesh, role: string, materialFamily = "CONCRETE") => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.hostId = record.id;
    mesh.userData.hostSocket = "pressure_yard_camera_route_edge";
    mesh.userData.supportClass = "GROUNDED";
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

  const shape = new THREE.Shape();
  const outline = [
    [-36, -6.0], [-24, -8.1], [0, -7.8], [27, -6.2], [36, -2.4],
    [34, 4.2], [14, 6.7], [-12, 6.5], [-31, 5.4],
  ];
  shape.moveTo(outline[0][0], outline[0][1]);
  for (const [x, z] of outline.slice(1)) shape.lineTo(x, z);
  shape.closePath();
  const hardstand = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.08, bevelThickness: 0.04, curveSegments: 2 }), concrete);
  hardstand.rotation.x = -Math.PI / 2;
  hardstand.position.set(88, 0.03, 83.1);
  add(hardstand, "camera_service_hardstand_irregular_weathered_concrete_surface", "CONCRETE");

  const nearEdge = new THREE.Mesh(new RoundedBoxGeometry(54, 0.12, 0.24, 4, 0.035), edgeConcrete);
  nearEdge.position.set(82.5, 0.22, 89.9);
  nearEdge.rotation.y = -0.035;
  add(nearEdge, "camera_service_hardstand_near_edge_profile", "CONCRETE");
  const nearGutter = new THREE.Mesh(new RoundedBoxGeometry(51.5, 0.055, 0.42, 4, 0.025), gutter);
  nearGutter.position.set(82.5, 0.12, 90.24);
  nearGutter.rotation.y = -0.035;
  add(nearGutter, "camera_service_hardstand_near_edge_dark_gutter", "GUTTER");
  for (const x of [60, 82, 105]) {
    const inlet = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.07, 0.56, 3, 0.025), steel);
    inlet.position.set(x, 0.16, 90.25);
    inlet.rotation.y = -0.035;
    add(inlet, "camera_service_hardstand_near_edge_slot_drain", "DRAIN");
    for (const offset of [-0.38, 0, 0.38]) {
      const bar = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.04, 0.42, 3, 0.015), steel);
      bar.position.set(x + offset, 0.21, 90.25);
      bar.rotation.y = -0.035;
      add(bar, "camera_service_hardstand_near_edge_slot_drain_bar", "DRAIN");
    }
  }

  for (const x of [58, 86, 114]) {
    const jointLine = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.04, 11.4, 3, 0.018), joint);
    jointLine.position.set(x, 0.24, 82.8);
    jointLine.rotation.y = -0.035;
    add(jointLine, "camera_service_hardstand_transverse_construction_joint", "EXPANSION_JOINT");
  }
  for (const [index, x] of [68, 98].entries()) {
    const markingLine = new THREE.Mesh(new RoundedBoxGeometry(9.0, 0.035, 0.13, 3, 0.02), marking);
    markingLine.position.set(x, 0.24, 86.0);
    markingLine.rotation.y = -0.035;
    add(markingLine, `camera_service_hardstand_service_marking_${index + 1}`, "PAINTED_STEEL");
  }

  const recessedStrip = new THREE.Mesh(new RoundedBoxGeometry(34, 0.07, 0.52, 4, 0.025), joint);
  recessedStrip.position.set(108, 0.17, 78.25);
  recessedStrip.rotation.y = -0.035;
  add(recessedStrip, "camera_service_hardstand_vehicle_lane_recessed_strip", "EXPANSION_JOINT");

  root.add(group);
}
