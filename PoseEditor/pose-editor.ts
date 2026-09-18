import * as THREE from "three/webgpu";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { SVGRenderer } from "three/addons/renderers/SVGRenderer.js";
import {
  createConfiguredGLTFLoader,
  getCacheKey,
  getCachedOrFetchUrl,
  initKTX2Support,
  initKTX2SoftwareSupport,
  populateBlobUrlMap,
} from "../client/asset-cache";
import {
  normalizeGameplayPlayerModel,
  PLAYER_EYE_FORWARD_OFFSET,
} from "../client/src/systems/player-visual-calibration";
import {
  chooseVerifiedGripPose,
  resolveGripAnchors,
  type PoseDiagnostics,
} from "../client/weapons/pose-solver";
import { getPlayerHoldFrame } from "../client/weapons/player-hold-ik";
import { UTILITY_ASSET_DETAILS } from "../shared/asset-details";
import type { UtilityId } from "../shared/utilities";
import type { WeaponId } from "../shared/weapons";
import {
  aimDirectionFromBodyForward,
  directionAlignmentAngle,
  evaluateFirstPersonComposition,
  evaluatePoseEditorReadiness,
  FIRST_PERSON_BODY_FORWARD,
  FIRST_PERSON_MAX_DEPTH_SHIFT,
  FIRST_PERSON_MIN_ITEM_FRACTION,
  hasRenderedPixelContent,
  POSE_EDITOR_CLEAR_COLOR,
  type FirstPersonCompositionResult,
  type PoseEditorReadinessResult,
  opticalAxisCorrection,
  planFirstPersonContentScale,
  planFirstPersonDepth,
  planFirstPersonFit,
  type FirstPersonFitPlan,
} from "./pose-editor-composition";
import {
  asDirection3,
  alignPoseFrame,
  bakeSkinnedMeshesForSoftware,
  cameraBasis,
  currentMuzzlePoint,
  disposeGeneratedPoseResources,
  findNamed,
  findPlacementAnchor,
  hideFirstPersonHead,
  measureProbedBarrelAxis,
  placementAnchorPoint,
  prepareBarrelMeasurement,
  projectedBounds,
  visibleWorldBounds,
  worldSpan,
  type BarrelDirectionMeasurement,
  type BarrelMeasurement,
  type PlacementAnchorMode,
  type ProjectedBounds,
} from "./pose-editor-geometry";
import {
  getPoseEditorItem,
  POSE_EDITOR_ITEMS,
  type PoseEditorItem,
  type PoseEditorItemId,
} from "./pose-editor-config";

type ViewMode = "first" | "third";
type PoseRenderer = THREE.WebGPURenderer | SVGRenderer;
type RendererBackend = "webgpu" | "webgl2" | "svg";

interface UtilityPoseResult {
  solved: boolean;
  reason: string;
  scale: number;
  anchorName?: string;
  anchorMode: PlacementAnchorMode;
  anchorError: number;
  orientationAlignment: number | null;
  orientationSource: string;
}

interface EditorState {
  renderer: PoseRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  loader: ReturnType<typeof createConfiguredGLTFLoader>;
  playerTemplate: THREE.Group | null;
  playerLoadPromise: Promise<void> | null;
  playerAnimations: THREE.AnimationClip[];
  itemTemplate: THREE.Group | null;
  itemTemplateId: PoseEditorItemId | null;
  poseRoot: THREE.Group | null;
  firstPersonContent: THREE.Group | null;
  debugRoot: THREE.Group;
  character: THREE.Group | null;
  item: THREE.Group | null;
  view: ViewMode;
  itemId: PoseEditorItemId;
  backend: RendererBackend;
  result: PoseDiagnostics | UtilityPoseResult | null;
  firstPersonFit: FirstPersonFitDiagnostics | null;
  firstPersonComposition: FirstPersonCompositionResult | null;
  firstPersonReadiness: PoseEditorReadinessResult | null;
  renderHealth: RenderHealth;
  barrelMeasurement: BarrelMeasurement | null;
  barrelDiagnostics: BarrelDiagnostics | null;
  clipName: string;
}

interface FirstPersonFitDiagnostics extends FirstPersonFitPlan {
  shoulderWidth: number;
  handWidth: number;
  handSeparationFraction: number;
  leftHandVisible: boolean;
  rightHandVisible: boolean;
  bodyProjectedWidthFraction: number;
  bodyProjectedHeightFraction: number;
  contentVisible: boolean;
  contentProjectedWidthFraction: number;
  contentProjectedHeightFraction: number;
  itemVisible: boolean;
  itemProjectedWidthFraction: number;
  itemProjectedHeightFraction: number;
  itemOrientationAlignment: number | null;
  projectedWidthFraction: number;
  projectedHeightFraction: number;
  depthShift: number;
  minDepth: number;
  muzzleCameraAlignment: number;
  barrelCameraAlignment: number | null;
  barrelAxisAgreement: number;
  barrelDirectionSource: string;
}

interface BarrelDiagnostics {
  cameraAlignment: number | null;
  axisAgreement: number;
  source: BarrelDirectionMeasurement["source"];
  actual: boolean;
}

interface RenderHealth {
  contextLost: boolean;
  durableFrame: boolean;
  canvasContent: boolean;
  validationPending: boolean;
  validationAttempts: number;
}

const FIRST_PERSON_FOV = 72;
const FIRST_PERSON_MIN_DEPTH = 0.08;
const FIRST_PERSON_MAX_WIDTH_FRACTION = 0.72;
const FIRST_PERSON_MAX_HEIGHT_FRACTION = 0.68;
const FIRST_PERSON_READABLE_MARGIN = FIRST_PERSON_MIN_ITEM_FRACTION;
// The normalized player presents its chest toward +Z in the editor scene.
const EDITOR_BODY_FORWARD = new THREE.Vector3(
  FIRST_PERSON_BODY_FORWARD.x,
  FIRST_PERSON_BODY_FORWARD.y,
  FIRST_PERSON_BODY_FORWARD.z,
);

const canvas = document.querySelector<HTMLCanvasElement>("#pose-canvas");
const itemSelect = document.querySelector<HTMLSelectElement>("#pose-item");
const viewSelect = document.querySelector<HTMLSelectElement>("#pose-view");
const reloadButton = document.querySelector<HTMLButtonElement>("#pose-reload");
const status = document.querySelector<HTMLElement>("#pose-status");
const loading = document.querySelector<HTMLElement>("#pose-loading");
const readout = document.querySelector<HTMLElement>("#pose-readout");

if (!canvas || !itemSelect || !viewSelect || !reloadButton || !status || !loading || !readout) {
  throw new Error("Pose editor shell is incomplete");
}

const params = new URLSearchParams(window.location.search);
const initialItem = getPoseEditorItem(params.get("item") || "rifle")?.id || "rifle";
const initialView: ViewMode = params.get("view") === "first" ? "first" : "third";
let selectionGeneration = 0;
let state: EditorState | null = null;

for (const item of POSE_EDITOR_ITEMS) {
  const option = document.createElement("option");
  option.value = item.id;
  option.textContent = item.label;
  itemSelect.append(option);
}
itemSelect.value = initialItem;
viewSelect.value = initialView;

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  for (const entry of Array.isArray(material) ? material : [material]) entry.dispose();
}

function disposeAssetTree(root: THREE.Object3D): void {
  root.traverse((child: any) => {
    child.geometry?.dispose?.();
    if (child.material) disposeMaterial(child.material);
  });
}

function worldPoint(root: THREE.Object3D, names: readonly string[]): THREE.Vector3 | null {
  const node = findNamed(root, names);
  return node ? node.getWorldPosition(new THREE.Vector3()) : null;
}

function playerHandNode(character: THREE.Object3D, side: "Left" | "Right"): THREE.Object3D | null {
  return findNamed(character, [
    `mixamorig:${side}Hand`,
    `mixamorig${side}Hand`,
    `${side}Hand`,
    `arm_${side.toLowerCase()}_hand`,
  ]);
}

function playerHand(character: THREE.Object3D, side: "Left" | "Right"): THREE.Vector3 | null {
  return playerHandNode(character, side)?.getWorldPosition(new THREE.Vector3()) || null;
}

function playerHead(character: THREE.Object3D): THREE.Vector3 {
  return worldPoint(character, ["mixamorig:Head", "mixamorigHead", "Head"]) || new THREE.Vector3(0, 1.55, 0);
}

function playerJoint(character: THREE.Object3D, side: "Left" | "Right", joint: "Shoulder" | "ForeArm"): THREE.Vector3 | null {
  return worldPoint(character, [
    `mixamorig:${side}${joint}`,
    `mixamorig${side}${joint}`,
    `${side}${joint}`,
    `arm_${side.toLowerCase()}_${joint === "Shoulder" ? "top" : "fore_arm"}`,
  ]);
}

function hasFirstPersonArmChain(root: THREE.Object3D, side: "Left" | "Right"): boolean {
  return ["Shoulder", "Arm", "ForeArm", "Hand"].every((joint) => findNamed(root, [
    `mixamorig:${side}${joint}`,
    `mixamorig${side}${joint}`,
    `${side}${joint}`,
  ]) !== null);
}

function playerEye(character: THREE.Object3D): THREE.Vector3 {
  return playerHead(character).add(
    new THREE.Vector3(0, 0, PLAYER_EYE_FORWARD_OFFSET)
      .applyQuaternion(character.getWorldQuaternion(new THREE.Quaternion())),
  );
}

function projectedFractions(projection: ProjectedBounds | null): {
  visible: boolean;
  width: number;
  height: number;
} {
  if (!projection) return { visible: false, width: 0, height: 0 };
  return {
    visible: true,
    width: (projection.maxX - projection.minX) / 2,
    height: (projection.maxY - projection.minY) / 2,
  };
}

function hasReadableProjectedBounds(
  projection: ProjectedBounds | null,
  minimumFraction: number,
): boolean {
  if (!projection || !Number.isFinite(minimumFraction) || minimumFraction <= 0) return false;
  const visibleWidth = Math.min(1, projection.maxX) - Math.max(-1, projection.minX);
  const visibleHeight = Math.min(1, projection.maxY) - Math.max(-1, projection.minY);
  return visibleWidth / 2 >= minimumFraction && visibleHeight / 2 >= minimumFraction;
}

function isReadableProjectedPoint(point: THREE.Vector3 | null, camera: THREE.PerspectiveCamera): boolean {
  if (!point) return false;
  const projected = point.clone().project(camera);
  return Number.isFinite(projected.x)
    && Number.isFinite(projected.y)
    && Number.isFinite(projected.z)
    && projected.x >= -1 + FIRST_PERSON_READABLE_MARGIN
    && projected.x <= 1 - FIRST_PERSON_READABLE_MARGIN
    && projected.y >= -1 + FIRST_PERSON_READABLE_MARGIN
    && projected.y <= 1 - FIRST_PERSON_READABLE_MARGIN
    && projected.z >= -1
    && projected.z <= 1;
}

function addBarrelVisualDiagnostics(): void {
  if (!state || !state.item || !state.barrelMeasurement) return;
  const measurement = state.barrelMeasurement.actual
    || state.barrelMeasurement.measurement;
  const authoredEnd = state.view === "first"
    ? currentMuzzlePoint(state.item, state.itemId as WeaponId)
    : state.barrelMeasurement.authored.end;
  const forward = cameraBasis(state.camera).forward;
  addMarker(state.debugRoot, authoredEnd, 0xef4444, 0.028);
  addLine(state.debugRoot, measurement.start, measurement.end, 0x84cc16);
  addLine(state.debugRoot, authoredEnd, authoredEnd.clone().addScaledVector(forward, 0.45), 0xffffff);
}

function addPoseVisualDiagnostics(): void {
  if (!state || state.view === "first" && !state.firstPersonContent) return;
  clearDebugRoot();
  if (state.character && state.item && getPoseEditorItem(state.itemId)?.category === "weapon") {
    addWeaponDiagnostics(state.character, state.item, state.itemId as WeaponId);
    addBarrelVisualDiagnostics();
  }
  state.debugRoot.visible = true;
}

function updateBarrelDiagnostics(): void {
  if (!state || !state.barrelMeasurement || !state.item) {
    if (state) state.barrelDiagnostics = null;
    return;
  }
  const basis = cameraBasis(state.camera);
  const actual = state.view === "first" ? state.barrelMeasurement.actual : null;
  state.barrelDiagnostics = {
    cameraAlignment: actual
      ? directionAlignmentAngle(asDirection3(actual.direction), asDirection3(basis.forward))
      : null,
    axisAgreement: state.barrelMeasurement.authoredMeshAgreement,
    source: state.barrelMeasurement.measurement.source,
    actual: Boolean(actual),
  };
  if (state.firstPersonFit) {
    state.firstPersonFit.barrelCameraAlignment = state.barrelDiagnostics.cameraAlignment;
    state.firstPersonFit.barrelAxisAgreement = state.barrelDiagnostics.axisAgreement;
    state.firstPersonFit.barrelDirectionSource = state.barrelDiagnostics.source;
  }
}

function choosePlayerClip(item: PoseEditorItem): THREE.AnimationClip | undefined {
  if (!state) return undefined;
  const requestedClip = params.get("clip");
  const preferred = item.category === "weapon"
    ? item.id === "pistol"
      ? ["pistol_idle", "pistol_walk"]
      : ["rifle_idle", "rifle_aim_idle"]
    : ["rifle_idle", "rifle_aim_idle", "idle"];
  if (requestedClip && state.playerAnimations.some((clip) => clip.name === requestedClip)) {
    preferred.unshift(requestedClip);
  }
  for (const name of preferred) {
    const exact = state.playerAnimations.find((clip) => clip.name === name);
    if (exact) return exact;
  }
  return state.playerAnimations.find((clip) => /idle/i.test(clip.name)) || state.playerAnimations[0];
}

async function hasWebGPU(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

function hasWebGL2(): boolean {
  try {
    return Boolean(canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: true,
      preserveDrawingBuffer: true,
      stencil: false,
    }));
  } catch {
    return false;
  }
}

async function createRenderer(): Promise<{ renderer: PoseRenderer; backend: RendererBackend }> {
  const requestedWebGL = params.get("backend") === "webgl";
  const attempts: boolean[] = [];
  if (!requestedWebGL && await hasWebGPU()) attempts.push(false);
  if (hasWebGL2()) attempts.push(true);
  for (const forceWebGL of attempts) {
    let renderer: THREE.WebGPURenderer | null = null;
    try {
      renderer = new THREE.WebGPURenderer({
        canvas,
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        forceWebGL,
      });
      await renderer.init();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      initKTX2Support(renderer);
      return { renderer, backend: forceWebGL ? "webgl2" : "webgpu" };
    } catch (error) {
      renderer?.dispose();
    }
  }
  const softwareRenderer = new SVGRenderer();
  softwareRenderer.setQuality("high");
  softwareRenderer.setClearColor(new THREE.Color(0x080d14), 1);
  const stage = canvas.parentElement;
  if (stage) {
    softwareRenderer.domElement.setAttribute("aria-label", "Rendered player and held item pose");
    softwareRenderer.domElement.style.position = "absolute";
    softwareRenderer.domElement.style.inset = "0";
    softwareRenderer.domElement.style.width = "100%";
    softwareRenderer.domElement.style.height = "100%";
    softwareRenderer.domElement.style.pointerEvents = "none";
    stage.append(softwareRenderer.domElement);
    canvas.style.visibility = "hidden";
  }
  return { renderer: softwareRenderer, backend: "svg" };
}

function addEnvironment(scene: THREE.Scene, backend: RendererBackend): void {
  const software = backend === "svg";
  scene.background = new THREE.Color(0x080d14);
  scene.add(new THREE.HemisphereLight(0xd9efff, 0x101722, software ? 0.55 : 1.8));
  const key = new THREE.DirectionalLight(0xffffff, software ? 0.9 : 3.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x62d9ff, software ? 0.35 : 1.6);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x111923, roughness: 0.9, metalness: 0.05 }),
  );
  floor.name = "PoseEditorFloor";
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.002;
  scene.add(floor);
  const grid = new THREE.GridHelper(12, 24, 0x2a4558, 0x182936);
  grid.name = "PoseEditorGrid";
  grid.position.y = 0.002;
  scene.add(grid);
}

function setFirstPersonEnvironment(hidden: boolean): void {
  const showStage = !hidden && state?.backend !== "svg";
  state?.scene.getObjectByName("PoseEditorFloor") && (state.scene.getObjectByName("PoseEditorFloor")!.visible = Boolean(showStage));
  state?.scene.getObjectByName("PoseEditorGrid") && (state.scene.getObjectByName("PoseEditorGrid")!.visible = Boolean(showStage));
}

function addMarker(root: THREE.Group, point: THREE.Vector3, color: number, size = 0.025): void {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(size, 12, 8),
    new THREE.MeshBasicMaterial({ color }),
  );
  marker.position.copy(point);
  root.add(marker);
}

function addLine(root: THREE.Group, start: THREE.Vector3, end: THREE.Vector3, color: number): void {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  root.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color })));
}

function clearDebugRoot(): void {
  if (!state) return;
  for (const child of [...state.debugRoot.children]) {
    state.debugRoot.remove(child);
    disposeAssetTree(child);
  }
}

function addWeaponDiagnostics(character: THREE.Group, item: THREE.Group, itemId: WeaponId): void {
  if (!state) return;
  const left = playerHand(character, "Left");
  const right = playerHand(character, "Right");
  const anchors = resolveGripAnchors(item, itemId);
  const primary = anchors.primary.point.clone().applyMatrix4(item.matrixWorld);
  const support = anchors.support.point.clone().applyMatrix4(item.matrixWorld);
  const muzzle = anchors.muzzle.point.clone().applyMatrix4(item.matrixWorld);
  if (params.get("debug") === "1") {
    if (left) addMarker(state.debugRoot, left, 0x38bdf8);
    if (right) addMarker(state.debugRoot, right, 0xf97316);
    addMarker(state.debugRoot, primary, 0xf97316, 0.035);
    addMarker(state.debugRoot, support, 0x38bdf8, 0.035);
    addMarker(state.debugRoot, muzzle, 0xef4444, 0.035);
    addLine(state.debugRoot, primary, support, 0x38bdf8);
    addLine(state.debugRoot, primary, muzzle, 0xef4444);
  }
}

function solveUtilityPose(character: THREE.Group, item: THREE.Group, config: PoseEditorItem): UtilityPoseResult {
  const anchorMode: PlacementAnchorMode = config.placementAnchor || "node";
  const rightNode = playerHandNode(character, "Right");
  const right = rightNode?.getWorldPosition(new THREE.Vector3()) || null;
  const left = playerHand(character, "Left");
  if (!rightNode || !right) {
    return {
      solved: false,
      reason: "missing right hand",
      scale: 0,
      anchorMode,
      anchorError: Infinity,
      orientationAlignment: null,
      orientationSource: "unavailable",
    };
  }

  const contract = UTILITY_ASSET_DETAILS[config.id as UtilityId]?.animation;
  const anchor = findPlacementAnchor(item, [
    contract?.nodes.usePoint || "UtilityUsePoint",
    contract?.nodes.placementReference || "PlacementReference",
    contract?.nodes.throwRelease || "ThrowRelease",
  ]) || item;
  item.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(item);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const sourceLength = Math.max(sourceSize.x, sourceSize.y, sourceSize.z);
  if (!Number.isFinite(sourceLength) || sourceLength < 1e-5) {
    return {
      solved: false,
      reason: "empty utility bounds",
      scale: 0,
      anchorMode,
      anchorError: Infinity,
      orientationAlignment: null,
      orientationSource: "unavailable",
    };
  }

  item.scale.setScalar((config.targetLength || 0.2) / sourceLength);
  item.updateMatrixWorld(true);
  const placementReference = findNamed(item, [
    contract?.nodes.placementReference || "PlacementReference",
  ]);
  if (!placementReference && !config.placementFrame) {
    return {
      solved: false,
      reason: "missing authored placement reference",
      scale: item.scale.x,
      anchorName: anchor.name || "root",
      anchorMode,
      anchorError: Infinity,
      orientationAlignment: null,
      orientationSource: "unavailable",
    };
  }
  const targetQuaternion = rightNode.getWorldQuaternion(new THREE.Quaternion());
  const sourceForward = placementReference
    ? new THREE.Vector3(0, 0, -1).applyQuaternion(placementReference.getWorldQuaternion(new THREE.Quaternion()))
    : new THREE.Vector3(...config.placementFrame!.forward);
  const sourceUp = placementReference
    ? new THREE.Vector3(0, 1, 0).applyQuaternion(placementReference.getWorldQuaternion(new THREE.Quaternion()))
    : new THREE.Vector3(...config.placementFrame!.up);
  const orientation = alignPoseFrame(
    sourceForward,
    sourceUp,
    new THREE.Vector3(0, 0, -1).applyQuaternion(targetQuaternion),
    new THREE.Vector3(0, 1, 0).applyQuaternion(targetQuaternion),
  );
  if (!orientation) {
    return {
      solved: false,
      reason: "invalid authored utility orientation",
      scale: item.scale.x,
      anchorName: anchor.name || "root",
      anchorMode,
      anchorError: Infinity,
      orientationAlignment: null,
      orientationSource: "placement-reference+hand-frame",
    };
  }
  const parentQuaternion = item.parent?.getWorldQuaternion(new THREE.Quaternion()) || new THREE.Quaternion();
  const correctedWorldQuaternion = orientation.multiply(item.getWorldQuaternion(new THREE.Quaternion()));
  item.quaternion.copy(parentQuaternion.invert().multiply(correctedWorldQuaternion));
  item.updateMatrixWorld(true);
  const target = right.clone();
  if (left && config.id !== "Grenade" && config.id !== "Flashbang") target.lerp(left, 0.18);
  const targetParent = character.worldToLocal(target.clone());
  const anchorParent = character.worldToLocal(placementAnchorPoint(anchor, config.placementAnchor));
  item.position.add(targetParent.sub(anchorParent));
  item.updateMatrixWorld(true);

  const placedAnchor = placementAnchorPoint(anchor, config.placementAnchor);
  const anchorError = placedAnchor.distanceTo(target);
  const alignedReferenceDirection = placementReference
    ? new THREE.Vector3(0, 0, -1)
      .applyQuaternion(placementReference.getWorldQuaternion(new THREE.Quaternion()))
    : new THREE.Vector3(...config.placementFrame!.forward)
      .applyQuaternion(item.getWorldQuaternion(new THREE.Quaternion()));
  const targetHandDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(targetQuaternion);
  const orientationAlignment = directionAlignmentAngle(
    asDirection3(alignedReferenceDirection),
    asDirection3(targetHandDirection),
  );
  if (state && params.get("debug") === "1") {
    addMarker(state.debugRoot, target, 0xf97316);
    addMarker(state.debugRoot, placedAnchor, 0x38bdf8, 0.035);
    addLine(state.debugRoot, target, placedAnchor, 0x38bdf8);
  }
  return {
    solved: Number.isFinite(anchorError),
    reason: Number.isFinite(anchorError) ? "right-hand anchor aligned" : "invalid utility anchor",
    scale: item.scale.x,
    anchorName: anchor.name || "root",
    anchorMode,
    anchorError,
    orientationAlignment,
    orientationSource: placementReference
      ? "placement-reference+hand-frame"
      : "catalog-authored-frame+hand-frame",
  };
}

function solvedGripCenter(item: THREE.Object3D, itemId: PoseEditorItemId): THREE.Vector3 | null {
  if (getPoseEditorItem(itemId)?.category !== "weapon") return null;
  const anchors = resolveGripAnchors(item, itemId as WeaponId);
  const primary = anchors.primary.point.clone().applyMatrix4(item.matrixWorld);
  const support = anchors.support.point.clone().applyMatrix4(item.matrixWorld);
  return primary.add(support).multiplyScalar(0.5);
}

function composeFirstPersonPose(): void {
  if (!state || !state.poseRoot || !state.character || !state.item) return;
  const poseRoot = state.poseRoot;
  const character = state.character;
  const item = state.item;
  const content = state.firstPersonContent || item;

  poseRoot.position.set(0, 0, 0);
  poseRoot.scale.setScalar(1);
  if (state.firstPersonContent) {
    content.position.set(0, 0, 0);
    content.quaternion.identity();
    content.scale.setScalar(1);
  }
  poseRoot.updateMatrixWorld(true);

  let eye = playerEye(character);
  const characterQuaternion = character.getWorldQuaternion(new THREE.Quaternion());
  const bodyForward = EDITOR_BODY_FORWARD.clone().applyQuaternion(characterQuaternion).normalize();
  const bodyRight = new THREE.Vector3(1, 0, 0).applyQuaternion(characterQuaternion).normalize();
  const requestedPitch = Number(params.get("pitch"));
  const authoredAim = aimDirectionFromBodyForward(asDirection3(bodyForward), requestedPitch);
  const forward = new THREE.Vector3(authoredAim.x, authoredAim.y, authoredAim.z);
  const selectedItem = getPoseEditorItem(itemSelect.value);
  state.camera.position.copy(eye);
  state.camera.fov = FIRST_PERSON_FOV;
  state.camera.near = FIRST_PERSON_MIN_DEPTH;
  state.camera.lookAt(eye.clone().addScaledVector(forward, 2.4));
  state.camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  state.camera.updateProjectionMatrix();
  state.camera.updateMatrixWorld(true);

  const basis = cameraBasis(state.camera);
  const leftShoulder = playerJoint(character, "Left", "Shoulder");
  const rightShoulder = playerJoint(character, "Right", "Shoulder");
  const leftHand = playerHand(character, "Left");
  const rightHand = playerHand(character, "Right");
  const shoulderWidth = leftShoulder && rightShoulder
    ? leftShoulder.clone().sub(rightShoulder).dot(bodyRight)
    : 0;
  const handWidth = leftHand && rightHand
    ? leftHand.clone().sub(rightHand).dot(bodyRight)
    : 0;
  const playerWidth = Math.max(Math.abs(shoulderWidth), Math.abs(handWidth));
  const itemWidth = worldSpan(item, basis.right);
  const handSeparationFraction = leftHand && rightHand
    ? leftHand.clone().project(state.camera).distanceTo(rightHand.clone().project(state.camera))
    : 0;
  const plan = planFirstPersonFit(
    getPoseEditorItem(itemSelect.value)?.category || "weapon",
    playerWidth,
    itemWidth,
  );

  // The source character already carries the gameplay scale; fit the camera, not the rig.
  let fitScale = state.firstPersonContent ? 1 : Math.min(1, plan.scale);
  const gripCenter = selectedItem?.category === "weapon"
    ? solvedGripCenter(item, selectedItem.id)
    : item.getWorldPosition(new THREE.Vector3());
  const fitObject = state.firstPersonContent || item;
  const applyDepth = (depthShift: number): ProjectedBounds | null => {
    poseRoot.scale.setScalar(fitScale);
    if (state.firstPersonContent) {
      poseRoot.position.copy(eye).multiplyScalar(1 - fitScale);
    } else {
      poseRoot.position.copy(eye).multiplyScalar(1 - fitScale);
      if (gripCenter) {
        const transformedGrip = gripCenter.clone().multiplyScalar(fitScale).add(poseRoot.position);
        const correction = opticalAxisCorrection(
          asDirection3(transformedGrip),
          asDirection3(eye),
          asDirection3(basis.right),
        );
        if (correction) poseRoot.position.add(new THREE.Vector3(correction.x, correction.y, correction.z));
      }
      poseRoot.position.addScaledVector(basis.forward, depthShift);
    }
    poseRoot.updateMatrixWorld(true);
    if (state.firstPersonContent) {
      const cameraEye = eye.clone().multiplyScalar(fitScale).add(poseRoot.position);
      state.camera.position.copy(cameraEye);
      state.camera.lookAt(cameraEye.clone().addScaledVector(forward, 2.4));
      state.camera.updateMatrixWorld(true);
    }
    return projectedBounds(fitObject, state.camera, Boolean(state.firstPersonContent));
  };
  const fitsProjectedBounds = (candidate: ProjectedBounds | null): boolean => {
    if (!candidate || candidate.minDepth < FIRST_PERSON_MIN_DEPTH) return false;
    return (candidate.maxX - candidate.minX) / 2 <= FIRST_PERSON_MAX_WIDTH_FRACTION
      && (candidate.maxY - candidate.minY) / 2 <= FIRST_PERSON_MAX_HEIGHT_FRACTION;
  };

  let projected = applyDepth(0);
  if (!state.firstPersonContent && projected) {
    fitScale = planFirstPersonContentScale(
      fitScale,
      (projected.maxX - projected.minX) / 2,
      (projected.maxY - projected.minY) / 2,
      FIRST_PERSON_MAX_WIDTH_FRACTION,
      FIRST_PERSON_MAX_HEIGHT_FRACTION,
    );
    projected = applyDepth(0);
  }
  let lowDepthShift = 0;
  let highDepthShift = state.firstPersonContent ? 0 : Math.min(FIRST_PERSON_MAX_DEPTH_SHIFT, projected
    ? Math.max(
      FIRST_PERSON_MIN_DEPTH - projected.minDepth,
      planFirstPersonDepth(
        projected.depth,
        (projected.maxX - projected.minX) / 2,
        (projected.maxY - projected.minY) / 2,
        FIRST_PERSON_MAX_WIDTH_FRACTION,
        FIRST_PERSON_MAX_HEIGHT_FRACTION,
        FIRST_PERSON_MIN_DEPTH,
      ).shift,
      0,
    )
    : FIRST_PERSON_MIN_DEPTH);

  let candidate = applyDepth(highDepthShift);
  for (let iteration = 0; iteration < 24
    && !state.firstPersonContent
    && !fitsProjectedBounds(candidate)
    && highDepthShift < FIRST_PERSON_MAX_DEPTH_SHIFT; iteration += 1) {
    lowDepthShift = highDepthShift;
    highDepthShift = Math.min(
      FIRST_PERSON_MAX_DEPTH_SHIFT,
      Math.max(highDepthShift * 2, FIRST_PERSON_MIN_DEPTH),
    );
    candidate = applyDepth(highDepthShift);
  }
  if (fitsProjectedBounds(candidate)) {
    projected = candidate;
    for (let iteration = 0; iteration < 24; iteration += 1) {
      const midpoint = (lowDepthShift + highDepthShift) / 2;
      const midpointCandidate = applyDepth(midpoint);
      if (fitsProjectedBounds(midpointCandidate)) {
        highDepthShift = midpoint;
        projected = midpointCandidate;
      } else {
        lowDepthShift = midpoint;
      }
    }
  } else {
    projected = candidate || projected;
  }
  const depthShift = Math.min(FIRST_PERSON_MAX_DEPTH_SHIFT, highDepthShift);
  projected = applyDepth(depthShift) || projected;
  if (!state.firstPersonContent && projected) {
    for (let iteration = 0; iteration < 4; iteration += 1) {
      const nextScale = planFirstPersonContentScale(
        fitScale,
        (projected.maxX - projected.minX) / 2,
        (projected.maxY - projected.minY) / 2,
        FIRST_PERSON_MAX_WIDTH_FRACTION,
        FIRST_PERSON_MAX_HEIGHT_FRACTION,
      );
      if (nextScale >= fitScale - 1e-6) break;
      fitScale = nextScale;
      projected = applyDepth(depthShift) || projected;
    }
  }
  if (!projected) {
    const leftHandVisible = isReadableProjectedPoint(leftHand, state.camera);
    const rightHandVisible = isReadableProjectedPoint(rightHand, state.camera);
    const itemProjection = projectedBounds(item, state.camera);
    const itemFractions = projectedFractions(itemProjection);
    state.firstPersonFit = {
      ...plan,
      scale: fitScale,
      shoulderWidth: Math.abs(shoulderWidth),
      handWidth: Math.abs(handWidth),
      handSeparationFraction,
      leftHandVisible,
      rightHandVisible,
      bodyProjectedWidthFraction: 0,
      bodyProjectedHeightFraction: 0,
      contentVisible: false,
      contentProjectedWidthFraction: 0,
      contentProjectedHeightFraction: 0,
      itemVisible: itemFractions.visible
        && hasReadableProjectedBounds(itemProjection, FIRST_PERSON_MIN_ITEM_FRACTION),
      itemProjectedWidthFraction: itemFractions.width,
      itemProjectedHeightFraction: itemFractions.height,
      itemOrientationAlignment: null,
      projectedWidthFraction: 0,
      projectedHeightFraction: 0,
      depthShift,
      minDepth: 0,
      muzzleCameraAlignment: 0,
      barrelCameraAlignment: null,
      barrelAxisAgreement: Math.PI,
      barrelDirectionSource: "unavailable",
    };
    return;
  }

  let muzzleCameraAlignment = Math.PI;
  if (selectedItem?.category === "weapon") {
    const anchors = resolveGripAnchors(item, selectedItem.id as WeaponId);
    const primary = anchors.primary.point.clone().applyMatrix4(item.matrixWorld);
    const muzzle = anchors.muzzle.point.clone().applyMatrix4(item.matrixWorld);
    const socketDirection = muzzle.clone().sub(primary);
    if (socketDirection.lengthSq() > 1e-8) {
      muzzleCameraAlignment = directionAlignmentAngle(asDirection3(socketDirection), asDirection3(basis.forward));
    }
  }
  if (selectedItem?.category === "weapon" && state.barrelMeasurement) {
    state.barrelMeasurement.actual = measureProbedBarrelAxis(
      state.barrelMeasurement.measurement,
      currentMuzzlePoint(item, selectedItem.id as WeaponId),
    );
  }
  const contentProjection = projectedBounds(fitObject, state.camera, Boolean(state.firstPersonContent)) || projected;
  const contentFractions = projectedFractions(contentProjection);
  const bodyFractions = projectedFractions(
    projectedBounds(character, state.camera, Boolean(state.firstPersonContent)),
  );
  const leftHandVisible = isReadableProjectedPoint(leftHand, state.camera);
  const rightHandVisible = isReadableProjectedPoint(rightHand, state.camera);
  const itemProjection = projectedBounds(item, state.camera);
  const itemFractions = projectedFractions(itemProjection);
  const itemVisible = itemFractions.visible
    && hasReadableProjectedBounds(itemProjection, FIRST_PERSON_MIN_ITEM_FRACTION);
  const utilityResult = selectedItem?.category === "utility"
    && state.result
    && "orientationAlignment" in state.result
    ? state.result
    : null;
  state.firstPersonFit = {
    ...plan,
    scale: fitScale,
    shoulderWidth: Math.abs(shoulderWidth),
    handWidth: Math.abs(handWidth),
    handSeparationFraction,
    leftHandVisible,
    rightHandVisible,
    bodyProjectedWidthFraction: bodyFractions.width,
    bodyProjectedHeightFraction: bodyFractions.height,
    contentVisible: contentFractions.visible,
    contentProjectedWidthFraction: contentFractions.width,
    contentProjectedHeightFraction: contentFractions.height,
    itemVisible,
    itemProjectedWidthFraction: itemFractions.width,
    itemProjectedHeightFraction: itemFractions.height,
    itemOrientationAlignment: utilityResult?.orientationAlignment ?? null,
    projectedWidthFraction: itemFractions.width,
    projectedHeightFraction: itemFractions.height,
    depthShift,
    minDepth: contentProjection.minDepth,
    muzzleCameraAlignment,
    barrelCameraAlignment: state.barrelMeasurement?.actual
      ? directionAlignmentAngle(
        asDirection3(state.barrelMeasurement.actual.direction),
        asDirection3(basis.forward),
      )
      : null,
    barrelAxisAgreement: state.barrelMeasurement?.authoredMeshAgreement ?? Math.PI,
    barrelDirectionSource: state.barrelMeasurement?.measurement.source || "unavailable",
  };
}

function buildPose(item: PoseEditorItem): void {
  if (!state || !state.playerTemplate || !state.itemTemplate) return;
  clearDebugRoot();
  if (state.poseRoot) {
    disposeGeneratedPoseResources(state.poseRoot);
    state.scene.remove(state.poseRoot);
    state.poseRoot.clear();
  }
  const poseRoot = new THREE.Group();
  poseRoot.name = "PoseEditorPose";
  state.poseRoot = poseRoot;
  state.itemId = item.id;
  state.firstPersonContent = null;
  state.firstPersonFit = null;
  state.firstPersonComposition = null;
  state.firstPersonReadiness = null;
  state.renderHealth = {
    contextLost: state.renderHealth.contextLost,
    durableFrame: false,
    canvasContent: false,
    validationPending: false,
    validationAttempts: 0,
  };
  state.scene.add(poseRoot);

  const character = SkeletonUtils.clone(state.playerTemplate) as THREE.Group;
  const heldItem = SkeletonUtils.clone(state.itemTemplate) as THREE.Group;
  character.position.set(0, 0, 0);
  poseRoot.add(character);
  state.character = character;
  state.item = heldItem;
  state.barrelMeasurement = null;
  state.barrelDiagnostics = null;

  const clip = choosePlayerClip(item);
  state.clipName = clip?.name || "bind-pose";
  if (clip) {
    const mixer = new THREE.AnimationMixer(character);
    const action = mixer.clipAction(clip);
    action.play();
    const requestedSample = Number(params.get("sample"));
    const sample = Number.isFinite(requestedSample) ? Math.max(0, Math.min(1, requestedSample)) : 0.25;
    mixer.setTime(clip.duration * sample);
    mixer.update(0);
  }

  if (item.category === "weapon") {
    const poseContext = `${item.id}:${state.clipName}`;
    const pose = chooseVerifiedGripPose(character, heldItem, undefined, {
      weaponId: item.id as WeaponId,
      poseContext,
      holdFrame: getPlayerHoldFrame(item.id, state.clipName),
      diagnostics: true,
    });
    state.result = pose.diagnostics;
    state.barrelMeasurement = prepareBarrelMeasurement(heldItem, item.id as WeaponId);
    addWeaponDiagnostics(character, heldItem, item.id as WeaponId);
  } else {
    character.add(heldItem);
    state.result = solveUtilityPose(character, heldItem, item);
  }
  if (state.view === "first") {
    const content = new THREE.Group();
    content.name = "FirstPersonContent";
    poseRoot.add(content);
    character.userData.poseEditorHeadFilter = hideFirstPersonHead(character);
    content.attach(character);
    state.firstPersonContent = content;
    setFirstPersonEnvironment(true);
    state.debugRoot.visible = false;
  } else {
    setFirstPersonEnvironment(false);
    state.debugRoot.visible = true;
  }
  character.updateMatrixWorld(true);
  if (state.backend === "svg") bakeSkinnedMeshesForSoftware(character);
  heldItem.updateMatrixWorld(true);
  if (state.view === "first" && item.category === "weapon" && state.barrelMeasurement) {
    state.barrelMeasurement.actual = measureProbedBarrelAxis(
      state.barrelMeasurement.measurement,
      currentMuzzlePoint(heldItem, item.id as WeaponId),
    );
  }
  updateCamera();
  updateReadout(item);
}

function updateCamera(): void {
  if (!state || !state.character) return;
  const character = state.character;
  if (state.view === "first") {
    composeFirstPersonPose();
  } else {
    state.camera.position.set(1.65, 1.45, 3.1);
    state.camera.fov = 42;
    state.camera.lookAt(0, 0.98, 0.35);
    state.camera.near = 0.01;
    state.camera.updateProjectionMatrix();
  }
  state.camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  state.camera.updateProjectionMatrix();
  updateBarrelDiagnostics();
  if (params.get("debug") === "1" && getPoseEditorItem(state.itemId)?.category === "weapon") {
    addPoseVisualDiagnostics();
  }
}

function refreshReadout(): void {
  if (!state) return;
  const item = getPoseEditorItem(state.itemId);
  if (item) updateReadout(item);
}

function rendererWebGLContext(renderer: PoseRenderer): WebGL2RenderingContext | null {
  const candidate = renderer as unknown as { getContext?: () => unknown };
  if (typeof candidate.getContext !== "function") return null;
  const context = candidate.getContext();
  return context && typeof (context as WebGL2RenderingContext).readPixels === "function"
    ? context as WebGL2RenderingContext
    : null;
}

function inspectWebGLCanvasContent(renderer: PoseRenderer): boolean {
  const context = rendererWebGLContext(renderer);
  if (!context || context.isContextLost()) return false;
  const width = context.drawingBufferWidth;
  const height = context.drawingBufferHeight;
  if (width <= 0 || height <= 0) return false;
  const pixels = new Uint8Array(width * height * 4);
  try {
    context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, pixels);
    if (context.getError() !== context.NO_ERROR) return false;
  } catch {
    return false;
  }
  return hasRenderedPixelContent(pixels, width, height, POSE_EDITOR_CLEAR_COLOR);
}

async function inspectWebGPUCanvasContent(): Promise<boolean> {
  if (canvas.width <= 0 || canvas.height <= 0 || typeof canvas.toBlob !== "function") return false;
  if (typeof createImageBitmap !== "function") return false;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return false;
  const bitmap = await createImageBitmap(blob);
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = Math.min(256, canvas.width);
  sampleCanvas.height = Math.min(256, canvas.height);
  const context = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    return false;
  }
  context.drawImage(bitmap, 0, 0, sampleCanvas.width, sampleCanvas.height);
  const pixels = context.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
  bitmap.close();
  return hasRenderedPixelContent(
    pixels,
    sampleCanvas.width,
    sampleCanvas.height,
    POSE_EDITOR_CLEAR_COLOR,
  );
}

async function inspectRenderedCanvasContent(target: EditorState): Promise<boolean> {
  if (target.backend === "webgl2") return inspectWebGLCanvasContent(target.renderer);
  if (target.backend === "svg") {
    const svg = target.renderer.domElement as SVGSVGElement;
    return svg.childElementCount > 0
      && svg.querySelector("path, line, circle, polygon, polyline") !== null;
  }
  return inspectWebGPUCanvasContent();
}

function scheduleCanvasContentValidation(target: EditorState): void {
  const poseRoot = target.poseRoot;
  if (!poseRoot
    || target.renderHealth.contextLost
    || target.renderHealth.canvasContent
    || target.renderHealth.validationPending
    || target.renderHealth.validationAttempts >= 3) return;

  target.renderHealth.validationPending = true;
  target.renderHealth.validationAttempts += 1;
  window.setTimeout(() => {
    if (state !== target || target.poseRoot !== poseRoot) return;
    void inspectRenderedCanvasContent(target)
      .then((canvasContent) => {
        if (state !== target || target.poseRoot !== poseRoot) return;
        target.renderHealth.canvasContent = canvasContent;
        target.renderHealth.durableFrame = target.renderHealth.durableFrame && !target.renderHealth.contextLost;
        refreshReadout();
      })
      .catch(() => {
        if (state === target && target.poseRoot === poseRoot) refreshReadout();
      })
      .finally(() => {
        if (state === target && target.poseRoot === poseRoot) {
          target.renderHealth.validationPending = false;
        }
      });
  }, 0);
}

function installRendererHealthHandlers(renderer: PoseRenderer): void {
  const markContextLost = (message: string): void => {
    if (!state) return;
    state.renderHealth.contextLost = true;
    state.renderHealth.durableFrame = false;
    state.renderHealth.canvasContent = false;
    state.renderHealth.validationPending = false;
    status.textContent = message;
    refreshReadout();
  };
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    markContextLost("Renderer context lost");
  }, false);
  canvas.addEventListener("webglcontextrestored", () => {
    if (!state) return;
    state.renderHealth.contextLost = false;
    state.renderHealth.durableFrame = false;
    state.renderHealth.canvasContent = false;
    state.renderHealth.validationAttempts = 0;
    status.textContent = "Renderer context restored; waiting for a durable frame";
    refreshReadout();
  }, false);

  const deviceRenderer = renderer as unknown as {
    onDeviceLost?: (info: unknown) => void;
  };
  const originalOnDeviceLost = deviceRenderer.onDeviceLost;
  if (typeof originalOnDeviceLost === "function") {
    deviceRenderer.onDeviceLost = (info: unknown) => {
      markContextLost("Renderer device lost");
      originalOnDeviceLost.call(renderer, info);
    };
  }
}

function renderScene(): void {
  if (!state) return;
  const wasDurable = state.renderHealth.durableFrame;
  try {
    state.renderer.render(state.scene, state.camera);
    if (!state.renderHealth.contextLost) state.renderHealth.durableFrame = true;
  } catch (error) {
    if (!state.renderHealth.contextLost) {
      console.error("[POSE_EDITOR] render", error);
      state.renderHealth.contextLost = true;
    }
    state.renderHealth.durableFrame = false;
    state.renderHealth.canvasContent = false;
  }
  if (!wasDurable && state.renderHealth.durableFrame) refreshReadout();
  scheduleCanvasContentValidation(state);
}

function updateReadout(item: PoseEditorItem): void {
  if (!state || !state.character || !state.item) return;
  const bounds = new THREE.Box3().setFromObject(state.item);
  const size = bounds.getSize(new THREE.Vector3());
  const result = state.result;
  const headFilter = state.character.userData.poseEditorHeadFilter || null;
  const bilateralArmChain = hasFirstPersonArmChain(state.character, "Left")
    && hasFirstPersonArmChain(state.character, "Right");
  const fit = state.firstPersonFit;
  const selectedItem = getPoseEditorItem(state.itemId);
  state.firstPersonComposition = state.view !== "first"
    ? null
    : fit
      ? evaluateFirstPersonComposition({
        bilateralArmChain,
        handSeparationFraction: fit.handSeparationFraction,
        leftHandVisible: fit.leftHandVisible,
        rightHandVisible: fit.rightHandVisible,
        bodyVisible: fit.bodyProjectedWidthFraction > 0 && fit.bodyProjectedHeightFraction > 0,
        bodyWidthFraction: fit.bodyProjectedWidthFraction,
        bodyHeightFraction: fit.bodyProjectedHeightFraction,
        contentVisible: fit.contentVisible,
        contentWidthFraction: fit.contentProjectedWidthFraction,
        contentHeightFraction: fit.contentProjectedHeightFraction,
        itemVisible: fit.itemVisible,
        itemWidthFraction: fit.itemProjectedWidthFraction,
        itemHeightFraction: fit.itemProjectedHeightFraction,
        minDepth: fit.minDepth,
        depthShift: fit.depthShift,
        naturalFirstPersonCropping: true,
        requiresItemOrientation: selectedItem?.category === "utility",
        itemOrientationAlignment: fit.itemOrientationAlignment,
        requiresBarrelAlignment: selectedItem?.category === "weapon",
        barrelCameraAlignment: fit.barrelCameraAlignment,
        barrelAxisAgreement: fit.barrelAxisAgreement,
      })
      : { accepted: false, reason: "first-person fit unavailable" };
  const compositionAccepted = state.view !== "first" || Boolean(state.firstPersonComposition?.accepted);
  const solverVerified = result
    ? "verified" in result ? result.verified : result.solved
    : false;
  state.firstPersonReadiness = evaluatePoseEditorReadiness({
    solverVerified,
    compositionAccepted,
    contextLost: state.renderHealth.contextLost,
    durableFrame: state.renderHealth.durableFrame,
    canvasContent: state.renderHealth.canvasContent,
  });
  const poseVerified = state.firstPersonReadiness.accepted;
  const lines = [
    `asset=${item.modelKey}`,
    `view=${state.view} backend=${state.backend}`,
    `player=Player_one-optimized.glb clip=${state.clipName}`,
    `bounds=${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}m`,
  ];
  if (item.category === "weapon" && result && "weaponScale" in result) {
    lines.push(
      `pose=${poseVerified ? "VERIFIED" : "REJECTED"} solver=${result.verified ? "VERIFIED" : "REJECTED"} candidate=${result.reason || "none"}`,
      `scale=${result.weaponScale.toFixed(5)} grip=${result.primaryGripError.toFixed(4)}/${result.supportGripError.toFixed(4)}m`,
      `muzzle=${result.muzzleDirectionError.toFixed(4)}rad sockets=${Object.values(result.socketSources).join(",")}`,
      `clipping=${result.clipping.weaponBody || result.clipping.weaponArm || result.clipping.handForearm ? "detected" : "clear"}`,
    );
  } else if (result && "anchorError" in result) {
    lines.push(
      `pose=${poseVerified ? "ALIGNED" : "REJECTED"} solver=${result.solved ? "ALIGNED" : "REJECTED"} anchor=${result.anchorName || "none"} mode=${result.anchorMode}`,
      `scale=${result.scale.toFixed(5)} anchorError=${result.anchorError.toFixed(4)}m`,
      `orientation=${result.orientationSource} alignment=${result.orientationAlignment === null ? "unavailable" : `${result.orientationAlignment.toFixed(4)}rad`}`,
    );
  }
  if (state.barrelDiagnostics) {
    const cameraAlignment = state.barrelDiagnostics.cameraAlignment === null
      ? state.view === "first" ? "unavailable" : "not-applicable"
      : `${state.barrelDiagnostics.cameraAlignment.toFixed(4)}rad`;
    lines.push(
      `barrel=${state.barrelDiagnostics.source} authoredAgreement=${state.barrelDiagnostics.axisAgreement.toFixed(4)}rad actual=${state.barrelDiagnostics.actual ? "measured" : "not-measured"} diagnosticAlignment=${cameraAlignment}`,
    );
  }
  if (state.view === "first" && state.firstPersonFit) {
    lines.push(
      `sourceBody=${compositionAccepted ? "ready" : "rejected"} headTriangles=${headFilter?.hiddenTriangles || 0}/${headFilter?.sourceTriangles || 0} bones=${bilateralArmChain ? "bilateral" : "incomplete"}`,
      `compositionGate=${state.firstPersonComposition?.reason || "not-applicable"}`,
      `readiness=${state.firstPersonReadiness.reason}`,
      `composition=complete-body playerWidth=${state.firstPersonFit.playerWidth.toFixed(3)}m itemWidth=${state.firstPersonFit.itemWidth.toFixed(3)}m`,
      `fitScale=${state.firstPersonFit.scale.toFixed(4)} targetWidth=${state.firstPersonFit.targetWidth.toFixed(3)}m itemProjected=${state.firstPersonFit.itemProjectedWidthFraction.toFixed(3)}x${state.firstPersonFit.itemProjectedHeightFraction.toFixed(3)}`,
      `contentProjected=${state.firstPersonFit.contentProjectedWidthFraction.toFixed(3)}x${state.firstPersonFit.contentProjectedHeightFraction.toFixed(3)} bodyProjected=${state.firstPersonFit.bodyProjectedWidthFraction.toFixed(3)}x${state.firstPersonFit.bodyProjectedHeightFraction.toFixed(3)} hands=${state.firstPersonFit.handSeparationFraction.toFixed(3)} readable=${state.firstPersonFit.leftHandVisible && state.firstPersonFit.rightHandVisible ? "yes" : "no"}`,
      `depthShift=${state.firstPersonFit.depthShift.toFixed(3)}m near=${state.firstPersonFit.minDepth.toFixed(3)}m socketCamera=${state.firstPersonFit.muzzleCameraAlignment.toFixed(4)}rad`,
    );
  }
  readout.textContent = lines.join("\n");
  (window as any).__poseEditorState = {
    item: item.id,
    view: state.view,
    backend: state.backend,
    modelKey: item.modelKey,
    clip: state.clipName,
    result: state.result,
    bounds: { x: size.x, y: size.y, z: size.z },
    firstPersonFit: state.firstPersonFit,
    firstPersonComposition: state.firstPersonComposition,
    firstPersonReadiness: state.firstPersonReadiness,
    renderHealth: {
      contextLost: state.renderHealth.contextLost,
      durableFrame: state.renderHealth.durableFrame,
      canvasContent: state.renderHealth.canvasContent,
    },
    headFilter,
    barrelDiagnostics: state.barrelDiagnostics,
  };
}

async function loadPlayer(): Promise<void> {
  if (!state || state.playerTemplate) return;
  if (!state.playerLoadPromise) {
    status.textContent = "Loading Player_one…";
    const loadPromise = (async () => {
      if (!state) return;
      const url = await getPoseAssetUrl("Player_one-optimized.glb");
      const gltf = await state.loader.loadAsync(url);
      if (!state) return;
      state.playerTemplate = gltf.scene as THREE.Group;
      normalizeGameplayPlayerModel(state.playerTemplate);
      state.playerAnimations = gltf.animations;
    })();
    state.playerLoadPromise = loadPromise;
  }
  const loadPromise = state.playerLoadPromise;
  try {
    await loadPromise;
  } finally {
    if (state?.playerLoadPromise === loadPromise) state.playerLoadPromise = null;
  }
}

async function loadItem(item: PoseEditorItem): Promise<THREE.Group> {
  if (!state) throw new Error("Pose editor state is unavailable");
  if (state.itemTemplateId === item.id && state.itemTemplate) return state.itemTemplate;
  status.textContent = `Loading ${item.modelKey}…`;
  const url = await getPoseAssetUrl(item.modelKey);
  const gltf = await state.loader.loadAsync(url);
  return gltf.scene as THREE.Group;
}

async function getPoseAssetUrl(filename: string): Promise<string> {
  const localUrl = `/assets/maps/map_1/${getCacheKey(filename, "Asset")}`;
  try {
    const response = await fetch(localUrl, { method: "HEAD" });
    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    if (response.ok && !contentType.includes("text/html")) return localUrl;
  } catch {
    // Fall through to the normal cache/CDN path outside the local editor build.
  }
  return getCachedOrFetchUrl(filename, "Asset");
}

async function renderSelection(): Promise<void> {
  if (!state) return;
  const generation = ++selectionGeneration;
  const item = getPoseEditorItem(itemSelect.value);
  if (!item) return;
  state.view = viewSelect.value as ViewMode;
  loading.hidden = false;
  try {
    await loadPlayer();
    const loadedItem = await loadItem(item);
    if (generation !== selectionGeneration || !state) {
      if (state?.itemTemplate !== loadedItem) disposeAssetTree(loadedItem);
      return;
    }
    if (state.itemTemplate && state.itemTemplate !== loadedItem) disposeAssetTree(state.itemTemplate);
    state.itemTemplate = loadedItem;
    state.itemTemplateId = item.id;
    buildPose(item);
    loading.hidden = true;
    status.textContent = `${item.label} / ${state.view.toUpperCase()} / ${state.backend.toUpperCase()}`;
    renderScene();
  } catch (error) {
    if (generation !== selectionGeneration || !state) return;
    loading.hidden = false;
    status.textContent = "Pose load failed";
    readout.textContent = error instanceof Error ? error.stack || error.message : String(error);
    console.error("[POSE_EDITOR]", error);
  }
}

function resize(): void {
  if (!state) return;
  const width = Math.max(1, canvas.clientWidth || window.innerWidth);
  const height = Math.max(1, canvas.clientHeight || window.innerHeight);
  state.renderer.setSize(width, height, false);
  updateCamera();
}

async function init(): Promise<void> {
  status.textContent = "Initializing WebGPURenderer…";
  const created = await createRenderer();
  if (created.backend === "svg") initKTX2SoftwareSupport();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
  const debugRoot = new THREE.Group();
  debugRoot.name = "PoseEditorDiagnostics";
  scene.add(debugRoot);
  addEnvironment(scene, created.backend);
  state = {
    renderer: created.renderer,
    scene,
    camera,
    loader: createConfiguredGLTFLoader(
      undefined,
      created.backend === "svg" ? undefined : created.renderer,
    ),
    playerTemplate: null,
    playerLoadPromise: null,
    playerAnimations: [],
    itemTemplate: null,
    itemTemplateId: null,
    poseRoot: null,
    firstPersonContent: null,
    debugRoot,
    character: null,
    item: null,
    view: initialView,
    itemId: initialItem,
    backend: created.backend,
    result: null,
    firstPersonFit: null,
    firstPersonComposition: null,
    firstPersonReadiness: null,
    renderHealth: {
      contextLost: false,
      durableFrame: false,
      canvasContent: false,
      validationPending: false,
      validationAttempts: 0,
    },
    barrelMeasurement: null,
    barrelDiagnostics: null,
    clipName: "bind-pose",
  };
  installRendererHealthHandlers(created.renderer);
  resize();
  window.addEventListener("resize", resize);
  if ("setAnimationLoop" in created.renderer) {
    created.renderer.setAnimationLoop(() => renderScene());
  }
  await populateBlobUrlMap();
  await renderSelection();
}

itemSelect.addEventListener("change", () => void renderSelection());
viewSelect.addEventListener("change", () => void renderSelection());
reloadButton.addEventListener("click", () => void renderSelection());

(window as any).__poseEditor = {
  setSelection: async (item: string, view: ViewMode = "third") => {
    if (!getPoseEditorItem(item)) throw new Error(`Unknown pose editor item: ${item}`);
    itemSelect.value = item;
    viewSelect.value = view;
    await renderSelection();
  },
  getState: () => (window as any).__poseEditorState || null,
  getProjectionDiagnostics: () => {
    if (!state?.item) return null;
    state.item.updateMatrixWorld(true);
    state.camera.updateMatrixWorld(true);
    const inspectPoint = (point: THREE.Vector3 | undefined): { world: number[]; projected: number[] } | null => point
      ? { world: point.toArray(), projected: point.clone().project(state!.camera).toArray() }
      : null;
    const measurement = state.barrelMeasurement;
    const anchors = getPoseEditorItem(state.itemId)?.category === "weapon"
      ? resolveGripAnchors(state.item, state.itemId as WeaponId)
      : null;
    const anchorWorld = (point: THREE.Vector3): THREE.Vector3 => point.clone().applyMatrix4(state!.item!.matrixWorld);
    return {
      camera: {
        position: state.camera.position.toArray(),
        forward: cameraBasis(state.camera).forward.toArray(),
      },
      character: {
        name: state.character?.name || null,
        bounds: state.character ? visibleWorldBounds(state.character) : null,
        head: state.character ? playerHead(state.character).toArray() : null,
        eye: state.character ? playerEye(state.character).toArray() : null,
        leftShoulder: state.character ? playerJoint(state.character, "Left", "Shoulder")?.toArray() || null : null,
        rightShoulder: state.character ? playerJoint(state.character, "Right", "Shoulder")?.toArray() || null : null,
        leftHand: state.character ? playerHand(state.character, "Left")?.toArray() || null : null,
        rightHand: state.character ? playerHand(state.character, "Right")?.toArray() || null : null,
      },
      itemParent: state.item.parent?.name || null,
      itemWorldMatrix: state.item.matrixWorld.toArray(),
      itemBounds: visibleWorldBounds(state.item),
      primary: anchors ? inspectPoint(anchorWorld(anchors.primary.point)) : null,
      support: anchors ? inspectPoint(anchorWorld(anchors.support.point)) : null,
      muzzle: anchors ? inspectPoint(anchorWorld(anchors.muzzle.point)) : null,
      authored: measurement ? {
        start: inspectPoint(measurement.authored.start),
        end: inspectPoint(measurement.authored.end),
        direction: measurement.authored.direction.toArray(),
      } : null,
      actual: measurement?.actual ? {
        start: inspectPoint(measurement.actual.start),
        end: inspectPoint(measurement.actual.end),
        direction: measurement.actual.direction.toArray(),
      } : null,
    };
  },
  getBodyMetrics: () => {
    if (!state?.firstPersonContent || !state.character) return null;
    const bodyRoot = state.character;
    state.firstPersonContent.updateMatrixWorld(true);
    state.camera.updateMatrixWorld(true);
    const vertex = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const meshes: Array<Record<string, unknown>> = [];
    bodyRoot.traverse((child: any) => {
      if (!child.isMesh || !child.visible || typeof child.getVertexPosition !== "function") return;
      const position = child.geometry.getAttribute("position");
      if (!position) return;
      const min = new THREE.Vector3(Infinity, Infinity, Infinity);
      const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
      const screenMin = new THREE.Vector2(Infinity, Infinity);
      const screenMax = new THREE.Vector2(-Infinity, -Infinity);
      for (let index = 0; index < position.count; index += 1) {
        child.getVertexPosition(index, vertex);
        child.localToWorld(vertex);
        min.min(vertex);
        max.max(vertex);
        projected.copy(vertex).project(state.camera);
        screenMin.min(new THREE.Vector2(projected.x, projected.y));
        screenMax.max(new THREE.Vector2(projected.x, projected.y));
      }
      meshes.push({
        name: child.name,
        vertices: position.count,
        bounds: { min: min.toArray(), max: max.toArray() },
        screen: { min: screenMin.toArray(), max: screenMax.toArray() },
        groups: child.geometry.groups.map((group: { start: number; count: number; materialIndex: number }) => ({
          start: group.start,
          count: group.count,
          materialIndex: group.materialIndex,
        })),
      });
    });
    return {
      screen: meshes,
      bones: ["Left", "Right"].flatMap((side) => ({
        side,
        shoulder: playerJoint(bodyRoot, side as "Left" | "Right", "Shoulder")?.project(state!.camera).toArray() || null,
        elbow: playerJoint(bodyRoot, side as "Left" | "Right", "ForeArm")?.project(state!.camera).toArray() || null,
        hand: playerHand(bodyRoot, side as "Left" | "Right")?.project(state!.camera).toArray() || null,
      })),
      headFilter: bodyRoot.userData.poseEditorHeadFilter || null,
    };
  },
};

void init().catch((error) => {
  status.textContent = "Renderer initialization failed";
  readout.textContent = error instanceof Error ? error.stack || error.message : String(error);
  console.error("[POSE_EDITOR] init", error);
});
