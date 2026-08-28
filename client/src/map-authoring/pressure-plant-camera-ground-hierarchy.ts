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
 * A single, camera-readable industrial route edge. This is presentation-only
 * dressing attached to the existing pressure-yard surface owner; it does not
 * modify the frozen cover, road, stair, ramp, route, or gameplay records.
 */
export function addPressurePlantCameraGroundHierarchy({
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
  group.name = "pressure_plant_camera_route_hierarchy";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = "pressure_yard_camera_route_edge";
  group.userData.supportClass = "GROUNDED";
  group.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    role: "camera_visible_segmented_route_hierarchy_owner",
    materialFamily: "CONCRETE",
    presentationOnly: true,
  };

  const weatheredConcrete = (color: number, roughness: number, metalness: number, repeatX: number, repeatY: number, offsetX: number) => {
    const material = pressureMaterial(record, color, roughness, metalness).clone();
    if (surfaceTexture) {
      const map = surfaceTexture.clone();
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(repeatX, repeatY);
      map.offset.set(offsetX, 0.08);
      map.needsUpdate = true;
      material.map = map;
      material.bumpMap = map.clone();
      material.bumpMap.wrapS = THREE.RepeatWrapping;
      material.bumpMap.wrapT = THREE.RepeatWrapping;
      material.bumpMap.repeat.copy(map.repeat);
      material.bumpMap.offset.copy(map.offset);
      material.bumpScale = 0.055;
      material.needsUpdate = true;
    }
    return material;
  };
  const concreteA = weatheredConcrete(0x858983, 0.94, 0.04, 1.2, 0.95, 0.02);
  const concreteB = weatheredConcrete(0x707a75, 0.97, 0.035, 1.35, 1.05, 0.31);
  const curbMaterial = weatheredConcrete(0xa7aaa0, 0.9, 0.05, 2.6, 0.72, 0.16);
  const curbCapMaterial = weatheredConcrete(0xbab9ac, 0.86, 0.07, 3.1, 0.52, 0.44);
  const serviceApronA = weatheredConcrete(0x96998f, 0.93, 0.035, 1.55, 0.82, 0.12);
  const serviceApronB = weatheredConcrete(0x838a82, 0.96, 0.03, 1.72, 0.9, 0.38);
  const gutterMaterial = pressureMaterial(record, 0x283436, 0.98, 0.18);
  const drainFrameMaterial = pressureMaterial(record, 0x3c4847, 0.88, 0.3);
  const drainBarMaterial = pressureMaterial(record, 0x9ca59d, 0.62, 0.68);
  const jointMaterial = pressureMaterial(record, 0x4f5854, 0.98, 0.015);
  const markingMaterial = pressureMaterial(record, 0xa2713b, 0.8, 0.12);

  const add = (mesh: THREE.Mesh, role: string, materialFamily = "CONCRETE") => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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
      hostSocket: "pressure_yard_camera_route_edge",
    };
    group.add(mesh);
  };

  const segmentCenters = [62, 82, 102, 122, 142, 162];
  const segmentWidth = 18.4;
  // Keep the pedestrian band behind the curb so the existing Road012A lane
  // remains the dominant foreground surface in the locked player view.
  const sidewalkZ = 75.3;
  const sidewalkDepth = 5.6;
  for (const [index, x] of segmentCenters.entries()) {
    const slab = new THREE.Mesh(
      new RoundedBoxGeometry(segmentWidth, 0.24, sidewalkDepth, 5, 0.09),
      index % 2 === 0 ? concreteA : concreteB,
    );
    slab.position.set(x, 0.24, sidewalkZ);
    add(slab, `camera_route_segmented_concrete_sidewalk_slab_${index + 1}`);

    const transverseJoint = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.04, sidewalkDepth - 0.4, 3, 0.02), jointMaterial);
    transverseJoint.position.set(x + segmentWidth / 2 + 0.28, 0.38, sidewalkZ);
    add(transverseJoint, `camera_route_sidewalk_expansion_joint_${index + 1}`, "EXPANSION_JOINT");
  }

  const curbZ = 78.45;
  const curbCenters = [62, 82, 102, 122, 142, 162];
  for (const [index, x] of curbCenters.entries()) {
    const curb = new THREE.Mesh(new RoundedBoxGeometry(segmentWidth, 0.38, 0.52, 5, 0.075), curbMaterial);
    curb.position.set(x, 0.42, curbZ);
    add(curb, `camera_route_profiled_curb_segment_${index + 1}`, "CURB");

    const cap = new THREE.Mesh(new RoundedBoxGeometry(segmentWidth - 0.18, 0.065, 0.61, 4, 0.025), curbCapMaterial);
    cap.position.set(x, 0.645, curbZ - 0.015);
    add(cap, `camera_route_curb_light_coping_${index + 1}`, "CURB");

    const gutter = new THREE.Mesh(new RoundedBoxGeometry(segmentWidth - 0.6, 0.07, 1.0, 4, 0.025), gutterMaterial);
    gutter.position.set(x, 0.13, curbZ - 0.72);
    add(gutter, `camera_route_dark_gutter_segment_${index + 1}`, "GUTTER");
  }

  // The service apron is the hardstand transition between the wet Road012A
  // edge and the court. Segmenting it keeps the ground legible at player scale
  // without adding a detached slab or changing the frozen road footprint.
  const serviceApronZ = 82.15;
  const serviceApronDepth = 1.55;
  for (const [index, x] of segmentCenters.entries()) {
    const apron = new THREE.Mesh(
      new RoundedBoxGeometry(segmentWidth, 0.2, serviceApronDepth, 5, 0.06),
      index % 2 === 0 ? serviceApronA : serviceApronB,
    );
    apron.position.set(x, 0.2, serviceApronZ);
    add(apron, `camera_route_segmented_service_apron_panel_${index + 1}`);
    const seam = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.035, serviceApronDepth - 0.26, 3, 0.018), jointMaterial);
    seam.position.set(x + segmentWidth / 2 + 0.28, 0.32, serviceApronZ);
    add(seam, `camera_route_service_apron_construction_joint_${index + 1}`, "EXPANSION_JOINT");
    const toe = new THREE.Mesh(new RoundedBoxGeometry(segmentWidth - 0.42, 0.1, 0.12, 4, 0.025), curbCapMaterial);
    toe.position.set(x, 0.31, serviceApronZ - serviceApronDepth / 2 - 0.06);
    add(toe, `camera_route_service_apron_wet_edge_toe_${index + 1}`, "CURB");
  }

  // Three inlets make the route edge read as a drainage system rather than a
  // decorative line. Their spacing is deliberately bounded by sidewalk seams.
  for (const [index, x] of [72, 112, 152].entries()) {
    const frame = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.12, 0.84, 4, 0.04), drainFrameMaterial);
    frame.position.set(x, 0.22, curbZ - 0.72);
    add(frame, `camera_route_storm_drain_inlet_frame_${index + 1}`, "DRAIN");
    for (const offset of [-0.42, -0.14, 0.14, 0.42]) {
      const bar = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.05, 0.64, 3, 0.018), drainBarMaterial);
      bar.position.set(x + offset, 0.31, curbZ - 0.72);
      add(bar, `camera_route_storm_drain_inlet_bar_${index + 1}`, "DRAIN");
    }
  }

  // A restrained service marking provides functional scale and direction while
  // remaining separate from the frozen route lines and gameplay records.
  for (const [index, x] of [84, 126, 168].entries()) {
    const dash = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.035, 0.14, 3, 0.025), markingMaterial);
    dash.position.set(x, 0.39, 85.48);
    dash.rotation.y = -0.035;
    add(dash, `camera_route_pedestrian_service_marking_${index + 1}`, "PAINTED_STEEL");
  }

  // Ground the already-loaded sourced service tree clone with an irregular
  // planted island. The island stays outside the route/cover contract and
  // leaves the curb and sidewalk termination readable from the locked camera.
  const plantingMaterial = pressureMaterial(record, 0x514a38, 0.98, 0.0);
  const plantingShape = new THREE.Shape();
  plantingShape.moveTo(-7.2, -1.8);
  plantingShape.lineTo(-4.2, -3.05);
  plantingShape.lineTo(2.9, -2.7);
  plantingShape.lineTo(7.0, -1.25);
  plantingShape.lineTo(6.2, 2.25);
  plantingShape.lineTo(1.15, 3.05);
  plantingShape.lineTo(-4.8, 2.55);
  plantingShape.closePath();
  const plantingBed = new THREE.Mesh(new THREE.ShapeGeometry(plantingShape), plantingMaterial);
  plantingBed.rotation.x = -Math.PI / 2;
  plantingBed.position.set(78.0, 0.145, 82.15);
  add(plantingBed, "camera_route_sourced_tree_clone_planted_soil_bed", "SOIL_ROCK");
  const plantingEdgeMaterial = pressureMaterial(record, 0x777a70, 0.94, 0.04);
  const plantingEdge = new THREE.Mesh(new RoundedBoxGeometry(10.8, 0.12, 0.18, 4, 0.035), plantingEdgeMaterial);
  plantingEdge.position.set(78.0, 0.21, 79.15);
  plantingEdge.rotation.y = -0.025;
  add(plantingEdge, "camera_route_sourced_tree_clone_planting_edge", "CONCRETE");

  const rightPlantingShape = new THREE.Shape();
  rightPlantingShape.moveTo(-4.6, -2.1);
  rightPlantingShape.lineTo(-2.4, -3.1);
  rightPlantingShape.lineTo(2.7, -2.6);
  rightPlantingShape.lineTo(4.5, -0.8);
  rightPlantingShape.lineTo(3.6, 2.35);
  rightPlantingShape.lineTo(-1.0, 3.0);
  rightPlantingShape.lineTo(-4.7, 1.7);
  rightPlantingShape.closePath();
  const rightPlantingBed = new THREE.Mesh(new THREE.ShapeGeometry(rightPlantingShape), plantingMaterial);
  rightPlantingBed.rotation.x = -Math.PI / 2;
  rightPlantingBed.position.set(128.0, 0.145, 91.0);
  add(rightPlantingBed, "camera_route_right_sourced_tree_planted_soil_bed", "SOIL_ROCK");
  const rightPlantingEdge = new THREE.Mesh(new RoundedBoxGeometry(7.5, 0.12, 0.18, 4, 0.035), plantingEdgeMaterial);
  rightPlantingEdge.position.set(128.0, 0.21, 87.95);
  rightPlantingEdge.rotation.y = 0.02;
  add(rightPlantingEdge, "camera_route_right_sourced_tree_planting_edge", "CONCRETE");

  // One functional vertical landmark, placed in the open service-court margin;
  // it is not cover and does not block the existing route or ramp.
  const signSteel = pressureMaterial(record, 0x3f4e4b, 0.68, 0.62);
  const signPanel = pressureMaterial(record, 0x68756d, 0.82, 0.34);
  const signPostLeft = new THREE.Mesh(new RoundedBoxGeometry(0.18, 4.35, 0.18, 4, 0.035), signSteel);
  signPostLeft.position.set(90.8, 2.18, 85.0);
  add(signPostLeft, "camera_route_service_wayfinding_sign_left_post", "GALVANIZED_STEEL");
  const signPostRight = new THREE.Mesh(new RoundedBoxGeometry(0.18, 4.35, 0.18, 4, 0.035), signSteel);
  signPostRight.position.set(93.2, 2.18, 85.0);
  add(signPostRight, "camera_route_service_wayfinding_sign_right_post", "GALVANIZED_STEEL");
  const signBoard = new THREE.Mesh(new RoundedBoxGeometry(2.8, 1.28, 0.14, 4, 0.045), signPanel);
  signBoard.position.set(92.0, 3.52, 85.0);
  signBoard.rotation.y = -1.5;
  add(signBoard, "camera_route_service_wayfinding_sign_panel", "PAINTED_STEEL");
  const signBand = new THREE.Mesh(new RoundedBoxGeometry(2.38, 0.16, 0.17, 3, 0.025), markingMaterial);
  signBand.position.set(92.0, 3.62, 84.91);
  signBand.rotation.y = -1.5;
  add(signBand, "camera_route_service_wayfinding_sign_hazard_band", "PAINTED_STEEL");
  const signCap = new THREE.Mesh(new RoundedBoxGeometry(3.08, 0.1, 0.22, 3, 0.03), signSteel);
  signCap.position.set(92.0, 4.2, 85.0);
  signCap.rotation.y = -1.5;
  add(signCap, "camera_route_service_wayfinding_sign_top_termination", "GALVANIZED_STEEL");

  // A shallow irregular wet band varies the Road012A response at the curb edge
  // without becoming a flat color decal or changing the lane geometry.
  const wetEdgeShape = new THREE.Shape();
  wetEdgeShape.moveTo(54, 79.55);
  wetEdgeShape.lineTo(74, 79.25);
  wetEdgeShape.lineTo(96, 79.7);
  wetEdgeShape.lineTo(116, 79.42);
  wetEdgeShape.lineTo(138, 79.82);
  wetEdgeShape.lineTo(164, 79.48);
  wetEdgeShape.lineTo(164, 80.7);
  wetEdgeShape.lineTo(140, 80.95);
  wetEdgeShape.lineTo(116, 80.6);
  wetEdgeShape.lineTo(94, 80.98);
  wetEdgeShape.lineTo(72, 80.58);
  wetEdgeShape.lineTo(54, 80.88);
  wetEdgeShape.closePath();
  const wetEdge = new THREE.Mesh(new THREE.ShapeGeometry(wetEdgeShape), pressureMaterial(record, 0x384844, 0.58, 0.035));
  wetEdge.rotation.x = -Math.PI / 2;
  wetEdge.position.y = 0.235;
  add(wetEdge, "camera_route_wet_asphalt_edge_variant", "ASPHALT");

  const wetCourtShape = new THREE.Shape();
  wetCourtShape.moveTo(94, 84.2);
  wetCourtShape.lineTo(111, 83.4);
  wetCourtShape.lineTo(132, 84.1);
  wetCourtShape.lineTo(153, 83.0);
  wetCourtShape.lineTo(169, 86.0);
  wetCourtShape.lineTo(166, 101.0);
  wetCourtShape.lineTo(151, 105.6);
  wetCourtShape.lineTo(131, 103.9);
  wetCourtShape.lineTo(112, 106.4);
  wetCourtShape.lineTo(96, 101.8);
  wetCourtShape.lineTo(99, 92.0);
  wetCourtShape.closePath();
  const wetCourt = new THREE.Mesh(new THREE.ShapeGeometry(wetCourtShape), pressureMaterial(record, 0x31403d, 0.58, 0.035));
  wetCourt.rotation.x = -Math.PI / 2;
  wetCourt.position.y = 0.238;
  add(wetCourt, "camera_route_wet_asphalt_service_court_variant", "ASPHALT");

  root.add(group);
}
