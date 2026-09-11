import * as THREE from "three/webgpu";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { WEAPON_ASSET_DETAILS } from "../shared/asset-details";
import type { WeaponId } from "../shared/weapons";
import { IS_DEV } from "../shared/gates/production.gate";
import { createConfiguredGLTFLoader, getCachedOrFetchUrl, populateBlobUrlMap } from "./asset-cache";
import { engineContext } from "./context/ClientEngineContext";
import { normalizeGameplayPlayerModel } from "./src/systems/player-visual-calibration";
import { chooseVerifiedGripPose, resolveGripAnchors, type PoseDiagnostics } from "./weapons/pose-solver";

interface PoseDiagnosisState {
  renderer: THREE.WebGPURenderer | null;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  playerTemplate: THREE.Group;
  ownsPlayerTemplate: boolean;
  playerAnimations: THREE.AnimationClip[];
  weaponTemplates: Map<WeaponId, THREE.Group>;
  weaponLoadErrors: Map<WeaponId, string>;
}

let activeState: PoseDiagnosisState | null = null;
let diagnosisGeneration = 0;

const WEAPON_IDS = Object.keys(WEAPON_ASSET_DETAILS) as WeaponId[];
const RIFLE_CLIPS = ["rifle_idle", "rifle_aim_idle", "rifle_run", "rifle_fire"] as const;
const PISTOL_CLIPS = ["pistol_idle", "pistol_run", "pistol_walk", "pistol_kneeling_idle", "pistol_jump"] as const;
const CLIP_OPTIONS = ["catalog-compatible", ...RIFLE_CLIPS, ...PISTOL_CLIPS] as const;
const POSE_SAMPLES = [0, 0.5, 1] as const;

interface PoseCheck {
  weaponId: WeaponId;
  clipName: string;
  sample: number;
  candidateId: string;
  rendered: boolean;
  diagnostics: PoseDiagnostics;
}

function formatDiagnostics(weaponId: WeaponId, diagnostics: PoseDiagnostics): string {
  const clipping = diagnostics.clipping;
  return [
    `${weaponId.padEnd(8)} ${diagnostics.verified ? "VERIFIED" : "REJECTED"}`,
    `scale=${diagnostics.weaponScale.toFixed(4)}`,
    `muzzle=${diagnostics.muzzleDirectionError.toFixed(4)}rad`,
    `muzzleDirection=${diagnostics.muzzleDirectionTrusted ? "trusted" : "untrusted"}`,
    `clip=${clipping.weaponBody ? "body " : ""}${clipping.weaponArm ? "arm " : ""}${clipping.handForearm ? "forearm" : ""}`.trim(),
    `reason=${diagnostics.reason ?? "none"}`,
    `sources=${Object.values(diagnostics.socketSources).join(",")}`,
    `nodes=${Object.entries(diagnostics.socketNodes).map(([socket, node]) => `${socket}:${node ?? "-"}`).join(",")}`,
  ].join(" | ");
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  for (const item of Array.isArray(material) ? material : [material]) item.dispose();
}

function disposePoseOwnedTree(root: THREE.Object3D): void {
  root.traverse((child: any) => {
    if (!child.userData?.poseDiagnosticOwned) return;
    child.geometry?.dispose?.();
    if (child.material) disposeMaterial(child.material);
  });
}

function disposePoseAssetTree(root: THREE.Object3D): void {
  root.traverse((child: any) => {
    child.geometry?.dispose?.();
    if (child.material) disposeMaterial(child.material);
  });
}

function disposePoseDiagnosisState(state: PoseDiagnosisState): void {
  for (const child of [...state.scene.children]) {
    state.scene.remove(child);
    if (child.userData?.poseDiagnosticOwned) disposePoseOwnedTree(child);
  }
  if (state.ownsPlayerTemplate) disposePoseAssetTree(state.playerTemplate);
  for (const template of state.weaponTemplates.values()) disposePoseAssetTree(template);
  state.weaponTemplates.clear();
  state.renderer?.dispose();
}

function markPoseOwned(root: THREE.Object3D): void {
  root.traverse((child) => {
    child.userData.poseDiagnosticOwned = true;
  });
}

function addMarker(scene: THREE.Scene, point: THREE.Vector3, color: number, size = 0.035): void {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(size, 8, 6),
    new THREE.MeshBasicMaterial({ color }),
  );
  markPoseOwned(marker);
  marker.position.copy(point);
  scene.add(marker);
}

function addArrow(scene: THREE.Scene, origin: THREE.Vector3, direction: THREE.Vector3, color: number, length = 0.4): void {
  if (direction.lengthSq() < 1e-8) return;
  const arrow = new THREE.ArrowHelper(direction.normalize(), origin, length, color, length * 0.18, length * 0.1);
  markPoseOwned(arrow);
  scene.add(arrow);
}

function addLine(scene: THREE.Scene, start: THREE.Vector3, end: THREE.Vector3, color: number): void {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
  markPoseOwned(line);
  scene.add(line);
}

function unavailableDiagnostics(reason: string): PoseDiagnostics {
  return {
    solved: false,
    verified: false,
    reason,
    weaponScale: 0,
    primaryGripError: Infinity,
    supportGripError: Infinity,
    gripSpanError: Infinity,
    gripOrientationError: Infinity,
    muzzleDirectionError: Infinity,
    muzzleDirectionTrusted: false,
    shoulderAlignmentError: Infinity,
    elbowBendError: Infinity,
    clipping: {
      checked: false,
      proxyComplete: false,
      weaponBody: false,
      weaponArm: false,
      handForearm: false,
      maxPenetration: 0,
    },
    stable: false,
    score: Infinity,
    socketSources: { primary: "procedural", support: "procedural", muzzle: "procedural", ads: "procedural" },
    socketNodes: { primary: undefined, support: undefined, muzzle: undefined, ads: undefined },
  };
}

function getWorldPoint(character: THREE.Object3D, ...names: string[]): THREE.Vector3 | null {
  for (const name of names) {
    const node = character.getObjectByName(name);
    if (node) return node.getWorldPosition(new THREE.Vector3());
  }
  const normalizedNames = names.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, ""));
  let found: THREE.Object3D | null = null;
  character.traverse((child) => {
    if (!found) {
      const normalized = child.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalizedNames.includes(normalized)) found = child;
    }
  });
  return found ? found.getWorldPosition(new THREE.Vector3()) : null;
}

function addPoseMarkers(scene: THREE.Scene, character: THREE.Group, weapon: THREE.Group, weaponId: WeaponId): void {
  const leftHand = getWorldPoint(character, "mixamorig:LeftHand", "mixamorigLeftHand", "LeftHand");
  const rightHand = getWorldPoint(character, "mixamorig:RightHand", "mixamorigRightHand", "RightHand");
  if (leftHand) addMarker(scene, leftHand, 0x38bdf8);
  if (rightHand) addMarker(scene, rightHand, 0xf97316);

  const anchors = resolveGripAnchors(weapon, weaponId);
  const primary = anchors.primary.point.clone().applyMatrix4(weapon.matrixWorld);
  const support = anchors.support.point.clone().applyMatrix4(weapon.matrixWorld);
  const muzzle = anchors.muzzle.point.clone().applyMatrix4(weapon.matrixWorld);
  addMarker(scene, primary, 0xf97316);
  addMarker(scene, support, 0x38bdf8);
  addMarker(scene, muzzle, 0xef4444);
  addArrow(scene, primary, support.clone().sub(primary), 0x38bdf8);
  addArrow(scene, primary, muzzle.clone().sub(primary), 0xef4444);

  const bodyNames = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head"];
  let previous: THREE.Vector3 | null = null;
  for (const name of bodyNames) {
    const point = getWorldPoint(character, `mixamorig:${name}`, `mixamorig${name}`, name);
    if (!point) continue;
    if (previous) addLine(scene, previous, point, 0xa855f7);
    previous = point;
  }
  for (const side of ["Left", "Right"] as const) {
    const shoulder = getWorldPoint(character, `mixamorig:${side}Shoulder`, `mixamorig${side}Shoulder`, `${side}Shoulder`);
    const elbow = getWorldPoint(character, `mixamorig:${side}ForeArm`, `mixamorig${side}ForeArm`, `${side}ForeArm`);
    const hand = getWorldPoint(character, `mixamorig:${side}Hand`, `mixamorig${side}Hand`, `${side}Hand`);
    if (shoulder && elbow) addLine(scene, shoulder, elbow, 0xfacc15);
    if (elbow && hand) addLine(scene, elbow, hand, 0xfacc15);
  }
}

function clipsForWeapon(weaponId: WeaponId, animations: readonly THREE.AnimationClip[]): THREE.AnimationClip[] {
  const names = weaponId === "pistol" ? PISTOL_CLIPS : RIFLE_CLIPS;
  return names
    .map((name) => animations.find((clip) => clip.name === name))
    .filter((clip): clip is THREE.AnimationClip => Boolean(clip));
}

function createPoseCheck(
  state: PoseDiagnosisState,
  weaponId: WeaponId,
  clip: THREE.AnimationClip,
  sample: number,
): PoseCheck {
  const character = SkeletonUtils.clone(state.playerTemplate) as THREE.Group;
  const weaponTemplate = state.weaponTemplates.get(weaponId);
  if (!weaponTemplate) {
    return {
      weaponId,
      clipName: clip.name,
      sample,
      candidateId: "none",
      rendered: false,
      diagnostics: unavailableDiagnostics(state.weaponLoadErrors.get(weaponId) || "asset unavailable"),
    };
  }

  const weapon = SkeletonUtils.clone(weaponTemplate) as THREE.Group;
  const mixer = new THREE.AnimationMixer(character);
  mixer.clipAction(clip).play();
  mixer.setTime(clip.duration * sample);
  const pose = chooseVerifiedGripPose(character, weapon, undefined, {
    weaponId,
    poseContext: `${weaponId}:${clip.name}:${sample}`,
    diagnostics: true,
  });
  const result = {
    weaponId,
    clipName: clip.name,
    sample,
    candidateId: pose.selected.id,
    rendered: false,
    diagnostics: pose.diagnostics,
  };
  mixer.stopAllAction();
  mixer.uncacheRoot(character);
  character.clear();
  weapon.clear();
  return result;
}

function createRenderedPoseCheck(
  character: THREE.Group,
  weapon: THREE.Group,
  weaponId: WeaponId,
  clip: THREE.AnimationClip,
  sample: number,
): PoseCheck {
  const mixer = new THREE.AnimationMixer(character);
  mixer.clipAction(clip).play();
  mixer.setTime(clip.duration * sample);
  const pose = chooseVerifiedGripPose(character, weapon, undefined, {
    weaponId,
    poseContext: `${weaponId}:${clip.name}:${sample}`,
    diagnostics: true,
  });
  return {
    weaponId,
    clipName: clip.name,
    sample,
    candidateId: pose.selected.id,
    rendered: true,
    diagnostics: pose.diagnostics,
  };
}

function createStage(state: PoseDiagnosisState, selectedClipName: string): PoseCheck[] {
  for (const child of [...state.scene.children]) {
    state.scene.remove(child);
    disposePoseOwnedTree(child);
  }

  state.scene.add(new THREE.HemisphereLight(0xb8d8ff, 0x101827, 1.8));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(3, 6, 8);
  state.scene.add(keyLight);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 8),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.92, metalness: 0 }),
  );
  markPoseOwned(ground);
  ground.rotation.x = -Math.PI / 2;
  state.scene.add(ground);

  const diagnostics: PoseCheck[] = [];
  const spacing = 2.25;
  const offset = (WEAPON_IDS.length - 1) * spacing * 0.5;

  WEAPON_IDS.forEach((weaponId, index) => {
    const character = SkeletonUtils.clone(state.playerTemplate) as THREE.Group;
    character.position.x = index * spacing - offset;
    state.scene.add(character);

    const compatibleClips = clipsForWeapon(weaponId, state.playerAnimations);
    const clip = compatibleClips.find((candidate) => candidate.name === selectedClipName)
      || compatibleClips[0];
    if (!clip) {
      diagnostics.push({
        weaponId,
        clipName: selectedClipName,
        sample: 0.5,
        candidateId: "none",
        rendered: false,
        diagnostics: unavailableDiagnostics("no compatible player clip"),
      });
      return;
    }
    const weapon = SkeletonUtils.clone(state.weaponTemplates.get(weaponId) || new THREE.Group()) as THREE.Group;
    state.scene.add(weapon);
    const result = createRenderedPoseCheck(character, weapon, weaponId, clip, 0.5);
    weapon.visible = true;
    diagnostics.push(result);
    addPoseMarkers(state.scene, character, weapon, weaponId);

    if (selectedClipName === "catalog-compatible") {
      for (const compatibleClip of compatibleClips) {
        for (const sample of POSE_SAMPLES) {
          if (compatibleClip === clip && sample === 0.5) continue;
          diagnostics.push(createPoseCheck(state, weaponId, compatibleClip, sample));
        }
      }
    }
  });

  state.renderer?.render(state.scene, state.camera);
  return diagnostics;
}

async function loadDiagnosisAssets(state: PoseDiagnosisState, status: HTMLElement): Promise<void> {
  await populateBlobUrlMap();
  const loader = createConfiguredGLTFLoader(undefined, state.renderer);
  const canonicalPlayer = engineContext.playerModel || (window as any).playerModel as THREE.Group | null;
  if (canonicalPlayer) {
    state.playerTemplate = canonicalPlayer;
    state.playerAnimations = (canonicalPlayer as any).animations || [];
  } else {
    const playerUrl = await getCachedOrFetchUrl("Player_one-optimized.glb", "Asset");
    const playerGltf = await loader.loadAsync(playerUrl);
    state.playerTemplate = playerGltf.scene as THREE.Group;
    state.ownsPlayerTemplate = true;
    normalizeGameplayPlayerModel(state.playerTemplate);
    state.playerAnimations = playerGltf.animations;
  }

  for (const weaponId of WEAPON_IDS) {
    status.textContent = `Loading ${weaponId}…`;
    const details = WEAPON_ASSET_DETAILS[weaponId];
    try {
      const weaponUrl = await getCachedOrFetchUrl(details.modelKey, "Asset");
      const weaponGltf = await loader.loadAsync(weaponUrl);
      state.weaponTemplates.set(weaponId, weaponGltf.scene as THREE.Group);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      state.weaponLoadErrors.set(weaponId, `asset unavailable: ${message}`);
      console.warn(`[POSE_DIAGNOSIS] Unable to load ${weaponId}:`, error);
    }
  }
}

function renderResults(
  container: HTMLElement,
  selectedClipName: string,
  results: PoseCheck[],
): void {
  const resultElement = container.querySelector<HTMLElement>("[data-pose-results]");
  if (!resultElement) return;
  resultElement.textContent = [
    `selection=${selectedClipName}`,
    ...results.map(({ weaponId, clipName, sample, candidateId, rendered, diagnostics }) =>
      `${rendered ? "[markers] " : "           "}${clipName.padEnd(22)} t=${sample.toFixed(1)} candidate=${candidateId} ${formatDiagnostics(weaponId, diagnostics)}`),
  ].join("\n");
  (window as any).__poseDiagnosis = results.map(({ weaponId, clipName, sample, candidateId, rendered, diagnostics }) => ({
    weaponId,
    clipName,
    sample,
    candidateId,
    rendered,
    ...diagnostics,
  }));
}

async function runDiagnosis(container: HTMLElement): Promise<void> {
  if (!IS_DEV) return;
  const generation = ++diagnosisGeneration;
  const isCurrent = () => generation === diagnosisGeneration;
  const status = container.querySelector<HTMLElement>("[data-pose-status]");
  const button = container.querySelector<HTMLButtonElement>("[data-pose-run]");
  const clipSelect = container.querySelector<HTMLSelectElement>("[data-pose-clip]");
  const stage = container.querySelector<HTMLElement>("[data-pose-stage]");
  if (!status || !button || !clipSelect || !stage) return;
  button.disabled = true;
  status.textContent = "Preparing WebGPU diagnostic…";

  try {
    let state = activeState;
    if (!state) {
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-label", "Private player and weapon pose diagnostic");
      stage.replaceChildren(canvas);
      let renderer: THREE.WebGPURenderer | null = null;
      try {
        renderer = new THREE.WebGPURenderer({
          canvas,
          antialias: true,
          forceWebGL: (window as any).isWebGPU === false,
        });
        await renderer.init();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      } catch (error) {
        renderer?.dispose();
        renderer = null;
        status.textContent = `WebGPU unavailable; running numeric-only pose checks (${error instanceof Error ? error.message : String(error)})`;
      }
      if (!isCurrent()) {
        renderer?.dispose();
        return;
      }
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-7, 7, 2.1, -0.2, 0.1, 100);
      camera.position.set(0, 1.05, 8);
      camera.lookAt(0, 1.05, 0);
      const nextState: PoseDiagnosisState = {
        renderer,
        scene,
        camera,
        playerTemplate: new THREE.Group(),
        ownsPlayerTemplate: false,
        playerAnimations: [],
        weaponTemplates: new Map(),
        weaponLoadErrors: new Map(),
      };
      try {
        await loadDiagnosisAssets(nextState, status);
      } catch (error) {
        disposePoseDiagnosisState(nextState);
        if (!isCurrent()) return;
        activeState = null;
        (window as any).__poseDiagnosis = [];
        const resultElement = container.querySelector<HTMLElement>("[data-pose-results]");
        if (resultElement) resultElement.textContent = "No successful run.";
        throw error;
      }
      if (!isCurrent()) {
        disposePoseDiagnosisState(nextState);
        return;
      }
      activeState = nextState;
      state = nextState;
    }

    if (!isCurrent()) return;
    if (!state) throw new Error("pose diagnostic state was not initialized");
    const width = Math.max(720, stage.clientWidth || 1100);
    state.renderer?.setSize(width, 480, false);
    const diagnostics = createStage(state, clipSelect.value);
    renderResults(container, clipSelect.value, diagnostics);
    const weaponCount = new Set(diagnostics.map(({ weaponId }) => weaponId)).size;
    status.textContent = `${state.renderer ? "Rendered" : "Numeric-only"}: verified ${diagnostics.filter(({ diagnostics: item }) => item.verified).length}/${diagnostics.length} sampled poses across ${weaponCount} weapons; [markers] identifies the rendered midpoint.`;
  } catch (error) {
    status.textContent = `Pose diagnostic failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error("[POSE_DIAGNOSIS]", error);
  } finally {
    if (!isCurrent()) return;
    button.disabled = false;
  }
}

export function disposePoseDiagnosisPanel(): void {
  diagnosisGeneration += 1;
  if (activeState) {
    disposePoseDiagnosisState(activeState);
    activeState = null;
  }
  (window as any).__poseDiagnosis = [];
}

export function renderPoseDiagnosisPanel(container: HTMLElement): void {
  disposePoseDiagnosisPanel();
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0.63rem;height:100%;overflow:auto;padding:0.63rem;">
      <h2 style="color:#67e8f9;margin:0;">PRIVATE POSE VERIFICATION</h2>
      <p style="color:#cbd5e1;margin:0;max-width:70rem;">Canonical player + catalog weapons. Orange/blue markers are primary/support grips, red is muzzle, purple/yellow lines are body and arm proxies.</p>
      <div style="display:flex;align-items:center;gap:0.63rem;flex-wrap:wrap;">
        <label for="pose-diagnosis-clip">Clip</label>
        <select id="pose-diagnosis-clip" data-pose-clip style="padding:0.35rem;">
          ${CLIP_OPTIONS.map((clip) => `<option value="${clip}">${clip === "catalog-compatible" ? "all compatible clips" : clip}</option>`).join("")}
        </select>
        <button type="button" data-pose-run style="padding:0.4rem 0.75rem;cursor:pointer;">RUN CANONICAL ASSETS</button>
        <span data-pose-status aria-live="polite" style="color:#a7f3d0;">Ready.</span>
      </div>
      <pre data-pose-results style="margin:0;padding:0.63rem;background:#020617;color:#a7f3d0;overflow:auto;white-space:pre-wrap;">No run yet.</pre>
      <div data-pose-stage style="min-height:30rem;background:#020617;border:1px solid #334155;overflow:hidden;"></div>
    </div>
  `;
  container.querySelector<HTMLButtonElement>("[data-pose-run]")?.addEventListener("click", () => void runDiagnosis(container));
  container.querySelector<HTMLSelectElement>("[data-pose-clip]")?.addEventListener("change", () => void runDiagnosis(container));
}