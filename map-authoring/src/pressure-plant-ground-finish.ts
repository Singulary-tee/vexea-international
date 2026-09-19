import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PressurePlantSliceDetail } from "./pressure-plant-slice-details";

type PressureMaterialFactory = (
  record: PressurePlantSliceDetail,
  colorOverride?: number,
  roughnessOverride?: number,
  metalnessOverride?: number,
) => THREE.MeshStandardMaterial;

function irregularSurface(centerX: number, centerZ: number, radiusX: number, radiusZ: number, skew: number) {
  const shape = new THREE.Shape();
  const points = 12;
  for (let index = 0; index < points; index += 1) {
    const angle = (index / points) * Math.PI * 2;
    const wobble = 1 + Math.sin(index * 2.7 + skew) * 0.12;
    const x = centerX + Math.cos(angle) * radiusX * wobble + Math.sin(angle * 2.0 + skew) * radiusX * 0.08;
    const z = centerZ + Math.sin(angle) * radiusZ * wobble + Math.cos(angle * 1.7 + skew) * radiusZ * 0.06;
    if (index === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  shape.closePath();
  return shape;
}

export function addPressureYardGroundFinish({
  group,
  record,
  pressureMaterial,
}: {
  group: THREE.Group;
  record: PressurePlantSliceDetail;
  pressureMaterial: PressureMaterialFactory;
}) {
  const wetMaterial = new THREE.MeshPhysicalMaterial({ color: 0x829b94, roughness: 0.2, metalness: 0.08, clearcoat: 0.32, clearcoatRoughness: 0.18, reflectivity: 0.56, envMapIntensity: 0.72 });
  const wetSheenMaterial = new THREE.MeshPhysicalMaterial({ color: 0xb5c3b8, roughness: 0.18, metalness: 0.07, clearcoat: 0.38, clearcoatRoughness: 0.16, reflectivity: 0.58, envMapIntensity: 0.74 });
  const repairedMaterial = new THREE.MeshStandardMaterial({ color: 0x66716b, roughness: 0.68, metalness: 0.08 });
  const wetContrastMaterial = new THREE.MeshPhysicalMaterial({ color: 0x718078, roughness: 0.13, metalness: 0.14, clearcoat: 0.78, clearcoatRoughness: 0.07, reflectivity: 0.86, envMapIntensity: 0.92 });
  const surfaces = [
    { shape: irregularSurface(-58, 72, 30, 11.0, 0.4), material: wetMaterial, role: "pressure_yard_foreground_wet_asphalt_broad_patch" },
    { shape: irregularSurface(-20, 48, 18, 6.0, 1.8), material: repairedMaterial, role: "pressure_yard_midground_asphalt_repair_panel" },
    { shape: irregularSurface(-26, 80, 24, 9.0, 3.1), material: wetMaterial, role: "pressure_yard_foreground_wet_asphalt_return_patch" },
    { shape: irregularSurface(-30, 72, 26, 2.6, 2.6), material: wetSheenMaterial, role: "pressure_yard_drain_adjacent_wet_sheen_band" },
    { shape: irregularSurface(-10, 84, 16, 2.6, 4.3), material: wetSheenMaterial, role: "pressure_yard_service_lane_wet_sheen_band" },
    { shape: irregularSurface(-31, 69, 40, 2.8, 5.1), material: repairedMaterial, role: "pressure_yard_foreground_repair_edge_band" },
    { shape: irregularSurface(-29, 64, 40, 2.8, 6.2), material: wetSheenMaterial, role: "pressure_yard_camera_court_drain_transition_sheen" },
    { shape: irregularSurface(-52, 91, 30, 4.6, 7.4), material: wetSheenMaterial, role: "pressure_yard_camera_foreground_puddle_sheen" },
    { shape: irregularSurface(-20, 84, 30, 4.8, 9.1), material: wetSheenMaterial, role: "pressure_yard_camera_visible_wet_service_lane" },
    { shape: irregularSurface(-34, 103, 30, 4.0, 0.7), material: wetContrastMaterial, role: "pressure_yard_camera_foreground_high_contrast_reflective_pool" },
    { shape: irregularSurface(-4, 96, 22, 4.8, 8.4), material: wetContrastMaterial, role: "pressure_yard_camera_service_court_reflective_pool" },
  ];
  for (const surface of surfaces) {
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(surface.shape), surface.material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.205;
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: surface.role };
    mesh.userData.materialFamily = "ASPHALT";
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const serviceApronMaterial = new THREE.MeshStandardMaterial({ color: 0xb2b0a6, roughness: 0.76, metalness: 0.06 });
  const serviceApron = new THREE.Mesh(new RoundedBoxGeometry(42.0, 0.28, 24.0, 5, 0.1), serviceApronMaterial);
  serviceApron.position.set(-17.0, 0.25, 70.0);
  serviceApron.userData.pressurePlantSlice = true;
  serviceApron.userData.pressurePlantDetailId = record.id;
  serviceApron.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_projected_concrete_service_apron" };
  serviceApron.receiveShadow = true;
  group.add(serviceApron);
  const serviceApronJointMaterial = new THREE.MeshStandardMaterial({ color: 0x666b65, roughness: 0.96, metalness: 0.02 });
  for (const jointX of [-16.8, -8.4, 0.0, 8.4, 16.8]) {
    const joint = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 22.2), serviceApronJointMaterial);
    joint.position.set(jointX - 17.0, 0.42, 70.0);
    joint.userData.pressurePlantSlice = true;
    joint.userData.pressurePlantDetailId = record.id;
    joint.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_projected_concrete_service_apron_expansion_joint" };
    group.add(joint);
  }
  const apronFarEdge = new THREE.Mesh(new RoundedBoxGeometry(34.0, 0.16, 0.3, 4, 0.04), pressureMaterial(record, 0x3c4744, 0.78, 0.16));
  apronFarEdge.position.set(-17.0, 0.42, 82.0);
  const cameraCourtMaterial = new THREE.MeshStandardMaterial({ color: 0x6d746f, roughness: 0.91, metalness: 0.04 });
  const cameraCourtX = -35.0;
  const cameraCourtZ = 78.0;
  const cameraCourt = new THREE.Mesh(new RoundedBoxGeometry(50.0, 0.24, 20.0, 6, 0.1), cameraCourtMaterial);
  cameraCourt.position.set(cameraCourtX, 0.18, cameraCourtZ);
  cameraCourt.userData.pressurePlantSlice = true;
  cameraCourt.userData.pressurePlantDetailId = record.id;
  cameraCourt.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_projected_right_service_court_concrete_transition" };
  cameraCourt.receiveShadow = true;
  group.add(cameraCourt);
  const cameraCourtEdge = new THREE.Mesh(new RoundedBoxGeometry(48.0, 0.18, 0.32, 4, 0.05), pressureMaterial(record, 0x394744, 0.8, 0.14));
  cameraCourtEdge.position.set(cameraCourtX, 0.4, cameraCourtZ + 10.0);
  cameraCourtEdge.userData.pressurePlantSlice = true;
  cameraCourtEdge.userData.pressurePlantDetailId = record.id;
  cameraCourtEdge.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_projected_right_service_court_dark_gutter_edge" };
  group.add(cameraCourtEdge);
  const cameraCourtJointMaterial = new THREE.MeshStandardMaterial({ color: 0x676c66, roughness: 0.94, metalness: 0.02 });
  for (const jointX of [-12.0, 0.0, 12.0]) {
    const cameraCourtJoint = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 18.6), cameraCourtJointMaterial);
    cameraCourtJoint.position.set(cameraCourtX + jointX, 0.34, cameraCourtZ);
    cameraCourtJoint.userData.pressurePlantSlice = true;
    cameraCourtJoint.userData.pressurePlantDetailId = record.id;
    cameraCourtJoint.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_projected_right_service_court_expansion_joint" };
    group.add(cameraCourtJoint);
  }
  const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0x9c9b92, roughness: 0.86, metalness: 0.04 });
  const cameraSidewalk = new THREE.Mesh(new RoundedBoxGeometry(52.0, 0.22, 7.2, 6, 0.08), sidewalkMaterial);
  cameraSidewalk.position.set(cameraCourtX, 0.34, 65.8);
  cameraSidewalk.userData.pressurePlantSlice = true;
  cameraSidewalk.userData.pressurePlantDetailId = record.id;
  cameraSidewalk.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_projected_shed_edge_segmented_sidewalk" };
  cameraSidewalk.receiveShadow = true;
  group.add(cameraSidewalk);
  const cameraSidewalkCurb = new THREE.Mesh(new RoundedBoxGeometry(52.0, 0.34, 0.7, 5, 0.08), pressureMaterial(record, 0xaaa89d, 0.82, 0.04));
  cameraSidewalkCurb.position.set(cameraCourtX, 0.43, 69.2);
  cameraSidewalkCurb.userData.pressurePlantSlice = true;
  cameraSidewalkCurb.userData.pressurePlantDetailId = record.id;
  cameraSidewalkCurb.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_projected_shed_edge_sidewalk_curb" };
  cameraSidewalkCurb.receiveShadow = true;
  group.add(cameraSidewalkCurb);
  const sidewalkJointMaterial = new THREE.MeshStandardMaterial({ color: 0x6e716b, roughness: 0.94, metalness: 0.01 });
  for (const jointX of [-24.0, -12.0, 0.0, 12.0, 24.0]) {
    const sidewalkJoint = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 6.5), sidewalkJointMaterial);
    sidewalkJoint.position.set(cameraCourtX + jointX, 0.47, 65.8);
    sidewalkJoint.userData.pressurePlantSlice = true;
    sidewalkJoint.userData.pressurePlantDetailId = record.id;
    sidewalkJoint.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_projected_shed_edge_sidewalk_expansion_joint" };
    group.add(sidewalkJoint);
  }
  const plantingSoilMaterial = new THREE.MeshStandardMaterial({ color: 0x514638, roughness: 0.99, metalness: 0.01 });
  const plantingBed = new THREE.Mesh(new RoundedBoxGeometry(25.0, 0.16, 4.8, 6, 0.14), plantingSoilMaterial);
  plantingBed.position.set(-63.0, 0.1, 73.6);
  plantingBed.userData.pressurePlantSlice = true;
  plantingBed.userData.pressurePlantDetailId = record.id;
  plantingBed.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_tree_route_grounded_planting_bed", materialFamily: "SOIL_ROCK" };
  plantingBed.receiveShadow = true;
  group.add(plantingBed);
  const plantingBedEdge = new THREE.Mesh(new RoundedBoxGeometry(25.4, 0.18, 0.24, 4, 0.04), sidewalkJointMaterial);
  plantingBedEdge.position.set(-63.0, 0.18, 71.05);
  plantingBedEdge.userData.pressurePlantSlice = true;
  plantingBedEdge.userData.pressurePlantDetailId = record.id;
  plantingBedEdge.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_tree_route_planting_bed_concrete_edge", materialFamily: "CONCRETE" };
  plantingBedEdge.receiveShadow = true;
  group.add(plantingBedEdge);

  const cameraCourtTransverseJoint = new THREE.Mesh(new THREE.BoxGeometry(48.0, 0.045, 0.14), cameraCourtJointMaterial);
  cameraCourtTransverseJoint.position.set(cameraCourtX, 0.34, cameraCourtZ - 3.4);
  cameraCourtTransverseJoint.userData.pressurePlantSlice = true;
  cameraCourtTransverseJoint.userData.pressurePlantDetailId = record.id;
  cameraCourtTransverseJoint.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_projected_right_service_court_transverse_expansion_joint" };
  group.add(cameraCourtTransverseJoint);
  apronFarEdge.userData.pressurePlantSlice = true;
  apronFarEdge.userData.pressurePlantDetailId = record.id;
  apronFarEdge.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_projected_concrete_service_apron_far_edge" };
  group.add(apronFarEdge);

  const drainFrameMaterial = pressureMaterial(record, 0x182729, 0.82, 0.42);
  const drainBarMaterial = pressureMaterial(record, 0xb4b9ae, 0.58, 0.76);
  const drainFrame = new THREE.Mesh(new RoundedBoxGeometry(42.0, 0.18, 2.2, 3, 0.06), drainFrameMaterial);
  drainFrame.position.set(-35, 0.36, 88.0);
  drainFrame.userData.pressurePlantSlice = true;
  drainFrame.userData.pressurePlantDetailId = record.id;
  drainFrame.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_storm_drain_channel_frame", hostRelativeVisualOffset: { x: -35, y: 0, z: 88 } };
  drainFrame.receiveShadow = true;
  group.add(drainFrame);
  for (let index = 0; index < 21; index += 1) {
    const bar = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.24, 1.62, 3, 0.035), drainBarMaterial);
    bar.position.set(-55.0 + index * 2.0, 0.57, 88.0);
    bar.userData.pressurePlantSlice = true;
    bar.userData.pressurePlantDetailId = record.id;
    bar.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_storm_drain_grate_bar", hostRelativeVisualOffset: { x: -35, y: 0, z: 88 } };
    bar.castShadow = true;
    group.add(bar);
  }

  // A short longitudinal catch drain reinforces the projected court edge and
  // gives the camera a readable runoff direction toward the existing cross drain.
  const sideDrainFrame = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.18, 26.0, 3, 0.05), drainFrameMaterial);
  sideDrainFrame.position.set(-17.0, 0.36, 82.0);
  sideDrainFrame.userData.pressurePlantSlice = true;
  sideDrainFrame.userData.pressurePlantDetailId = record.id;
  sideDrainFrame.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_longitudinal_storm_drain_channel_frame", hostRelativeVisualOffset: { x: -17, y: 0, z: 82 } };
  sideDrainFrame.receiveShadow = true;
  group.add(sideDrainFrame);
  for (let index = 0; index < 12; index += 1) {
    const sideDrainBar = new THREE.Mesh(new RoundedBoxGeometry(1.62, 0.24, 0.28, 3, 0.035), drainBarMaterial);
    sideDrainBar.position.set(-17.0, 0.57, 70.2 + index * 2.15);
    sideDrainBar.userData.pressurePlantSlice = true;
    sideDrainBar.userData.pressurePlantDetailId = record.id;
    sideDrainBar.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_longitudinal_storm_drain_grate_bar", hostRelativeVisualOffset: { x: -17, y: 0, z: 82 } };
    sideDrainBar.castShadow = true;
    group.add(sideDrainBar);
  }

  // A single player-scale service lamp and a bounded fence/gate sequence give the
  // court a vertical anchor and a legible operational boundary without changing
  // route, cover, camera, or gameplay semantics.
  const registerVisible = (mesh: THREE.Mesh, role: string, materialFamily = "CONCRETE") => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role, materialFamily };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const lampSteel = pressureMaterial(record, 0x475654, 0.58, 0.66);
  const lampFoot = registerVisible(new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 0.24, 16), lampSteel), "camera_visible_service_lamp_foot", "GALVANIZED_STEEL");
  lampFoot.position.set(-9.0, 0.12, 70.0);
  const lampShaft = registerVisible(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 8.4, 16), lampSteel), "camera_visible_service_lamp_shaft", "GALVANIZED_STEEL");
  lampShaft.position.set(-9.0, 4.32, 70.0);
  const lampCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-9.0, 8.48, 70.0),
    new THREE.Vector3(-9.0, 8.48, 70.7),
    new THREE.Vector3(-9.0, 8.24, 71.65),
  ]);
  registerVisible(new THREE.Mesh(new THREE.TubeGeometry(lampCurve, 8, 0.085, 8, false), lampSteel), "camera_visible_service_lamp_curved_arm", "GALVANIZED_STEEL");
  const lampGlowMaterial = new THREE.MeshStandardMaterial({ color: 0xffd6a0, emissive: 0xff8c42, emissiveIntensity: 1.15, roughness: 0.3, metalness: 0.08 });
  const lampHead = registerVisible(new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.18, 0.34, 3, 0.06), lampGlowMaterial), "camera_visible_service_lamp_head", "PAINTED_STEEL");
  lampHead.position.set(-9.0, 8.12, 71.7);
  const lampLight = new THREE.PointLight(0xffa466, 9.0, 19.0, 2.0);
  lampLight.position.set(-9.0, 8.0, 71.7);
  lampLight.userData.pressurePlantSlice = true;
  lampLight.userData.pressurePlantDetailId = record.id;
  lampLight.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_service_lamp_warm_practical" };
  group.add(lampLight);

  const fenceSteel = pressureMaterial(record, 0x3f4e4c, 0.66, 0.62);
  const fenceWire = new THREE.MeshStandardMaterial({ color: 0x64706b, roughness: 0.78, metalness: 0.52, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
  const fenceStart = 88.0 - 125.0;
  const fenceEnd = 132.0 - 125.0;
  const gateStart = 104.0 - 125.0;
  const gateEnd = 112.0 - 125.0;
  const fenceZ = 67.0;
  const postXs = [fenceStart, gateStart, gateEnd, fenceEnd];
  for (const postX of postXs) {
    const post = registerVisible(new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.14, 3.15, 12), fenceSteel), "camera_visible_service_boundary_fence_post", "GALVANIZED_STEEL");
    post.position.set(postX, 1.58, fenceZ);
    const cap = registerVisible(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12), lampGlowMaterial), "camera_visible_service_boundary_fence_post_cap", "GALVANIZED_STEEL");
    cap.position.set(postX, 3.18, fenceZ);
  }
  const addFenceRun = (minX: number, maxX: number) => {
    const runWidth = maxX - minX;
    const railTop = registerVisible(new THREE.Mesh(new RoundedBoxGeometry(runWidth, 0.12, 0.12, 3, 0.03), fenceSteel), "camera_visible_service_boundary_fence_top_rail", "GALVANIZED_STEEL");
    railTop.position.set((minX + maxX) / 2, 2.95, fenceZ);
    const railBottom = registerVisible(new THREE.Mesh(new RoundedBoxGeometry(runWidth, 0.1, 0.1, 3, 0.03), fenceSteel), "camera_visible_service_boundary_fence_bottom_rail", "GALVANIZED_STEEL");
    railBottom.position.set((minX + maxX) / 2, 0.18, fenceZ);
    const panelWidth = 5.6;
    for (let panelMin = minX; panelMin < maxX - 0.1; panelMin += panelWidth) {
      const panelMax = Math.min(maxX, panelMin + panelWidth);
      const panelCenter = (panelMin + panelMax) / 2;
      const panelSpan = panelMax - panelMin;
      for (const angle of [0.58, -0.58]) {
        const diagonal = registerVisible(new THREE.Mesh(new THREE.BoxGeometry(panelSpan * 1.12, 0.052, 0.052), fenceWire), "camera_visible_service_boundary_fence_chainlink_diamond", "GALVANIZED_STEEL");
        diagonal.position.set(panelCenter, 1.56, fenceZ - 0.035);
        diagonal.rotation.z = angle;
      }
    }
  };
  addFenceRun(fenceStart, gateStart);
  addFenceRun(gateEnd, fenceEnd);
  const gateHeader = registerVisible(new THREE.Mesh(new RoundedBoxGeometry(gateEnd - gateStart, 0.16, 0.16, 3, 0.04), fenceSteel), "camera_visible_service_boundary_gate_header", "GALVANIZED_STEEL");
  gateHeader.position.set((gateStart + gateEnd) / 2, 2.96, fenceZ);
  const accessSignBoard = registerVisible(new THREE.Mesh(new RoundedBoxGeometry(1.8, 1.05, 0.08, 3, 0.04), new THREE.MeshStandardMaterial({ color: 0xb97842, roughness: 0.7, metalness: 0.2 })), "camera_visible_service_boundary_access_warning_sign", "PAINTED_STEEL");
  accessSignBoard.position.set((gateStart + gateEnd) / 2, 2.15, fenceZ - 0.12);
  const accessSignInset = registerVisible(new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.08, 0.04, 3, 0.02), lampGlowMaterial), "camera_visible_service_boundary_access_warning_sign_mark", "PAINTED_STEEL");
  accessSignInset.position.set((gateStart + gateEnd) / 2, 2.15, fenceZ - 0.19);
}
