import * as THREE from "three/webgpu";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import {
  createConfiguredGLTFLoader,
  getCachedOrFetchUrl,
  initKTX2Support,
  populateBlobUrlMap,
} from "./asset-cache";
import { normalizeGameplayPlayerModel } from "./src/systems/player-visual-calibration";
import {
  chooseVerifiedGripPose,
  resolveGripAnchors,
  type PoseDiagnostics,
} from "./weapons/pose-solver";
import { UTILITY_ASSET_DETAILS } from "../shared/asset-details";
import type { UtilityId } from "../shared/utilities";
import type { WeaponId } from "../shared/weapons";
import {
  getPoseEditorItem,
  POSE_EDITOR_ITEMS,
  type PoseEditorItem,
  type PoseEditorItemId,
} from "./pose-editor-config";

 type ViewMode = "first" | "third";

interface UtilityPoseResult {
  solved: boolean;
  reason: string;
  scale: number;
  anchorName?: string;
  anchorError: number;
}

interface EditorState {
  renderer: THREE.WebGPURenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  loader: ReturnType<typeof createConfiguredGLTFLoader>;
  playerTemplate: THREE.Group | null;
  playerAnimations: THREE.AnimationClip[];
  itemTemplate: THREE.Group | null;
  itemTemplateId: PoseEditorItemId | null;
  poseRoot: THREE.Group | null;
  debugRoot: THREE.Group;
  character: THREE.Group | null;
  item: THREE.Group | null;
  view: ViewMode;
  itemId: PoseEditorItemId;
  backend: "webgpu" | "webgl2";
  result: PoseDiagnostics | UtilityPoseResult | null;
  clipName: string;
}

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

function normalizedName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findNamed(root: THREE.Object3D, names: readonly string[]): THREE.Object3D | null {
  const wanted = names.map(normalizedName);
  let found: THREE.Object3D | null = null;
  root.traverse((child) => {
    if (!found && wanted.includes(normalizedName(child.name))) found = child;
  });
  return found;
}

function worldPoint(root: THREE.Object3D, names: readonly string[]): THREE.Vector3 | null {
  const node = findNamed(root, names);
  return node ? node.getWorldPosition(new THREE.Vector3()) : null;
}

function playerHand(character: THREE.Object3D, side: "Left" | "Right"): THREE.Vector3 | null {
  return worldPoint(character, [
    `mixamorig:${side}Hand`,
    `mixamorig${side}Hand`,
    `${side}Hand`,
    `arm_${side.toLowerCase()}_hand`,
  ]);
}

function playerHead(character: THREE.Object3D): THREE.Vector3 {
  return worldPoint(character, ["mixamorig:Head", "mixamorigHead", "Head"]) || new THREE.Vector3(0, 1.55, 0);
}

function choosePlayerClip(item: PoseEditorItem): THREE.AnimationClip | undefined {
  if (!state) return undefined;
  const preferred = item.category === "weapon"
    ? item.id === "pistol" ? ["pistol_idle", "pistol_walk"] : ["rifle_idle", "rifle_aim_idle"]
    : ["rifle_idle", "rifle_aim_idle", "idle"];
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

async function createRenderer(): Promise<{ renderer: THREE.WebGPURenderer; backend: "webgpu" | "webgl2" }> {
  const requestedWebGL = params.get("backend") === "webgl";
  const attempts = requestedWebGL ? [true] : [(await hasWebGPU()) ? false : true, true];
  let lastError: unknown;
  for (const forceWebGL of [...new Set(attempts)]) {
    let renderer: THREE.WebGPURenderer | null = null;
    try {
      renderer = new THREE.WebGPURenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        forceWebGL,
      });
      await renderer.init();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      initKTX2Support(renderer);
      return { renderer, backend: forceWebGL ? "webgl2" : "webgpu" };
    } catch (error) {
      lastError = error;
      renderer?.dispose();
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function addEnvironment(scene: THREE.Scene): void {
  scene.background = new THREE.Color(0x080d14);
  scene.add(new THREE.HemisphereLight(0xd9efff, 0x101722, 1.8));
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x62d9ff, 1.6);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x111923, roughness: 0.9, metalness: 0.05 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.002;
  scene.add(floor);
  const grid = new THREE.GridHelper(12, 24, 0x2a4558, 0x182936);
  grid.position.y = 0.002;
  scene.add(grid);
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
  if (left) addMarker(state.debugRoot, left, 0x38bdf8);
  if (right) addMarker(state.debugRoot, right, 0xf97316);
  const anchors = resolveGripAnchors(item, itemId);
  const primary = anchors.primary.point.clone().applyMatrix4(item.matrixWorld);
  const support = anchors.support.point.clone().applyMatrix4(item.matrixWorld);
  const muzzle = anchors.muzzle.point.clone().applyMatrix4(item.matrixWorld);
  addMarker(state.debugRoot, primary, 0xf97316, 0.035);
  addMarker(state.debugRoot, support, 0x38bdf8, 0.035);
  addMarker(state.debugRoot, muzzle, 0xef4444, 0.035);
  addLine(state.debugRoot, primary, support, 0x38bdf8);
  addLine(state.debugRoot, primary, muzzle, 0xef4444);
}

function solveUtilityPose(character: THREE.Group, item: THREE.Group, config: PoseEditorItem): UtilityPoseResult {
  const right = playerHand(character, "Right");
  const left = playerHand(character, "Left");
  if (!right) return { solved: false, reason: "missing right hand", scale: 0, anchorError: Infinity };

  const contract = UTILITY_ASSET_DETAILS[config.id as UtilityId]?.animation;
  const anchor = findNamed(item, [
    contract?.nodes.usePoint || "UtilityUsePoint",
    contract?.nodes.placementReference || "PlacementReference",
    contract?.nodes.throwRelease || "ThrowRelease",
  ]) || item;
  item.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(item);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const sourceLength = Math.max(sourceSize.x, sourceSize.y, sourceSize.z);
  if (!Number.isFinite(sourceLength) || sourceLength < 1e-5) {
    return { solved: false, reason: "empty utility bounds", scale: 0, anchorError: Infinity };
  }

  item.scale.setScalar((config.targetLength || 0.2) / sourceLength);
  item.updateMatrixWorld(true);
  const target = right.clone();
  if (left && config.id !== "Grenade" && config.id !== "Flashbang") target.lerp(left, 0.18);
  const targetParent = character.worldToLocal(target.clone());
  const anchorParent = character.worldToLocal(anchor.getWorldPosition(new THREE.Vector3()));
  item.position.add(targetParent.sub(anchorParent));
  item.updateMatrixWorld(true);

  const anchorError = anchor.getWorldPosition(new THREE.Vector3()).distanceTo(target);
  if (state) {
    addMarker(state.debugRoot, target, 0xf97316);
    addMarker(state.debugRoot, anchor.getWorldPosition(new THREE.Vector3()), 0x38bdf8, 0.035);
    addLine(state.debugRoot, target, anchor.getWorldPosition(new THREE.Vector3()), 0x38bdf8);
  }
  return {
    solved: Number.isFinite(anchorError),
    reason: Number.isFinite(anchorError) ? "right-hand anchor aligned" : "invalid utility anchor",
    scale: item.scale.x,
    anchorName: anchor.name || "root",
    anchorError,
  };
}

function buildPose(item: PoseEditorItem): void {
  if (!state || !state.playerTemplate || !state.itemTemplate) return;
  clearDebugRoot();
  if (state.poseRoot) {
    state.scene.remove(state.poseRoot);
    state.poseRoot.clear();
  }
  const poseRoot = new THREE.Group();
  poseRoot.name = "PoseEditorPose";
  state.poseRoot = poseRoot;
  state.scene.add(poseRoot);

  const character = SkeletonUtils.clone(state.playerTemplate) as THREE.Group;
  const heldItem = SkeletonUtils.clone(state.itemTemplate) as THREE.Group;
  character.position.set(0, 0, 0);
  poseRoot.add(character);
  state.character = character;
  state.item = heldItem;

  const clip = choosePlayerClip(item);
  state.clipName = clip?.name || "bind-pose";
  if (clip) {
    const mixer = new THREE.AnimationMixer(character);
    const action = mixer.clipAction(clip);
    action.play();
    mixer.setTime(clip.duration * 0.5);
    mixer.update(0);
  }

  if (item.category === "weapon") {
    const pose = chooseVerifiedGripPose(character, heldItem, undefined, {
      weaponId: item.id as WeaponId,
      poseContext: `${item.id}:${state.clipName}`,
      diagnostics: true,
    });
    state.result = pose.diagnostics;
    addWeaponDiagnostics(character, heldItem, item.id as WeaponId);
  } else {
    character.add(heldItem);
    state.result = solveUtilityPose(character, heldItem, item);
  }
  if (state.view === "first") {
    poseRoot.attach(heldItem);
    character.visible = false;
    state.debugRoot.visible = false;
  } else {
    state.debugRoot.visible = true;
  }
  character.updateMatrixWorld(true);
  heldItem.updateMatrixWorld(true);
  updateCamera();
  updateReadout(item);
}

function updateCamera(): void {
  if (!state || !state.character) return;
  const character = state.character;
  const head = playerHead(character);
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(character.quaternion).normalize();
  if (state.view === "first") {
    state.camera.position.copy(head).addScaledVector(forward, 0.06);
    state.camera.position.y += 0.015;
    state.camera.fov = 72;
    state.camera.lookAt(head.clone().addScaledVector(forward, 2.4).add(new THREE.Vector3(0, -0.7, 0)));
  } else {
    state.camera.position.set(1.65, 1.45, 3.1);
    state.camera.fov = 42;
    state.camera.lookAt(0, 0.98, 0.35);
  }
  state.camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  state.camera.updateProjectionMatrix();
}

function updateReadout(item: PoseEditorItem): void {
  if (!state || !state.character || !state.item) return;
  const bounds = new THREE.Box3().setFromObject(state.item);
  const size = bounds.getSize(new THREE.Vector3());
  const result = state.result;
  const lines = [
    `asset=${item.modelKey}`,
    `view=${state.view} backend=${state.backend}`,
    `player=Player_one-optimized.glb clip=${state.clipName}`,
    `bounds=${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}m`,
  ];
  if (item.category === "weapon" && result && "weaponScale" in result) {
    lines.push(
      `pose=${result.verified ? "VERIFIED" : "REJECTED"} candidate=${result.reason || "none"}`,
      `scale=${result.weaponScale.toFixed(5)} grip=${result.primaryGripError.toFixed(4)}/${result.supportGripError.toFixed(4)}m`,
      `muzzle=${result.muzzleDirectionError.toFixed(4)}rad sockets=${Object.values(result.socketSources).join(",")}`,
      `clipping=${result.clipping.weaponBody || result.clipping.weaponArm || result.clipping.handForearm ? "detected" : "clear"}`,
    );
  } else if (result && "anchorError" in result) {
    lines.push(
      `pose=${result.solved ? "ALIGNED" : "REJECTED"} anchor=${result.anchorName || "none"}`,
      `scale=${result.scale.toFixed(5)} anchorError=${result.anchorError.toFixed(4)}m`,
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
  };
}

async function loadPlayer(): Promise<void> {
  if (!state || state.playerTemplate) return;
  status.textContent = "Loading Player_one…";
  const url = await getCachedOrFetchUrl("Player_one-optimized.glb", "Asset");
  const gltf = await state.loader.loadAsync(url);
  state.playerTemplate = gltf.scene as THREE.Group;
  normalizeGameplayPlayerModel(state.playerTemplate);
  state.playerAnimations = gltf.animations;
}

async function loadItem(item: PoseEditorItem): Promise<void> {
  if (!state) return;
  if (state.itemTemplateId === item.id && state.itemTemplate) return;
  if (state.itemTemplate) disposeAssetTree(state.itemTemplate);
  state.itemTemplate = null;
  state.itemTemplateId = null;
  status.textContent = `Loading ${item.modelKey}…`;
  const url = await getCachedOrFetchUrl(item.modelKey, "Asset");
  const gltf = await state.loader.loadAsync(url);
  state.itemTemplate = gltf.scene as THREE.Group;
  state.itemTemplateId = item.id;
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
    await loadItem(item);
    if (generation !== selectionGeneration || !state) return;
    buildPose(item);
    loading.hidden = true;
    status.textContent = `${item.label} / ${state.view.toUpperCase()} / ${state.backend.toUpperCase()}`;
  } catch (error) {
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
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
  const debugRoot = new THREE.Group();
  debugRoot.name = "PoseEditorDiagnostics";
  scene.add(debugRoot);
  addEnvironment(scene);
  state = {
    renderer: created.renderer,
    scene,
    camera,
    loader: createConfiguredGLTFLoader(undefined, created.renderer),
    playerTemplate: null,
    playerAnimations: [],
    itemTemplate: null,
    itemTemplateId: null,
    poseRoot: null,
    debugRoot,
    character: null,
    item: null,
    view: initialView,
    itemId: initialItem,
    backend: created.backend,
    result: null,
    clipName: "bind-pose",
  };
  resize();
  window.addEventListener("resize", resize);
  created.renderer.setAnimationLoop(() => created.renderer.render(scene, camera));
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
};

void init().catch((error) => {
  status.textContent = "Renderer initialization failed";
  readout.textContent = error instanceof Error ? error.stack || error.message : String(error);
  console.error("[POSE_EDITOR] init", error);
});
