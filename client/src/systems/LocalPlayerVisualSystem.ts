import * as THREE from "three/webgpu";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { PLAYER_CENTER_OFFSET, PLAYER_EYE_LEVEL } from "../../../shared/constants";
import { PLAYER_EYE_FORWARD_OFFSET } from "./player-visual-calibration";
import {
  disposeGeneratedPoseResources,
  hideFirstPersonHead,
  type FirstPersonHeadFilterStats,
} from "../../pose-editor-geometry";
import {
  resolvePlayerAnimationState,
  type AnimationOutput,
  type PlayerAnimationContext,
} from "../../../shared/state-animation-contract";
import {
  createRemotePlayerWeapon,
  hasRemoteWeaponTemplate,
} from "../../weapons_model";
import {
  chooseVerifiedGripPose,
  resolveGripAnchors,
  solveVerifiedGripPose,
  type PoseCandidate,
  type PoseDiagnostics,
} from "../../weapons/pose-solver";
import { getPlayerHoldFrame } from "../../weapons/player-hold-ik";

const HEAD_BONE_NAMES = ["mixamorig:Head", "mixamorigHead", "Head"];
const _headWorldPosition = new THREE.Vector3();

export interface LocalPlayerRepresentation {
  root: THREE.Group;
  model: THREE.Group;
  eyeAnchor: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  headFilter: FirstPersonHeadFilterStats;
  currentAction: THREE.AnimationAction | null;
  currentClipName: string | null;
}

function findNamedObject(root: THREE.Object3D, names: readonly string[]): THREE.Object3D | null {
  for (const name of names) {
    const object = root.getObjectByName(name);
    if (object) return object;
  }
  return null;
}

function updateEyeAnchor(representation: LocalPlayerRepresentation, eyeHeight: number): void {
  const head = findNamedObject(representation.model, HEAD_BONE_NAMES);
  if (head) {
    head.getWorldPosition(_headWorldPosition);
    representation.root.worldToLocal(_headWorldPosition);
    representation.eyeAnchor.position.copy(_headWorldPosition);
    representation.eyeAnchor.position.y += eyeHeight - PLAYER_EYE_LEVEL;
  } else {
    representation.eyeAnchor.position.set(0, eyeHeight, 0);
  }
  representation.eyeAnchor.position.z += PLAYER_EYE_FORWARD_OFFSET;
  representation.eyeAnchor.quaternion.identity();
  representation.eyeAnchor.updateMatrixWorld(true);
}

function markSharedResources(root: THREE.Object3D): void {
  root.traverse((child: any) => {
    if (child.geometry && !child.userData?.poseEditorOwnedGeometry) {
      child.geometry.userData.vexeaSharedAsset = true;
    }
    if (child.material) {
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        material.userData.vexeaSharedAsset = true;
      }
    }
  });
}

function findAnimation(model: THREE.Group, clipName: string): THREE.AnimationClip | undefined {
  const animations = (model as any).animations as THREE.AnimationClip[] | undefined;
  return animations?.find((clip) => clip.name === clipName) ?? animations?.[0];
}

function applyAnimationOutput(
  representation: LocalPlayerRepresentation,
  output: AnimationOutput,
): void {
  if (output.kind !== "clip") return;
  const clip = findAnimation(representation.model, output.clipName);
  if (!clip) return;

  const action = representation.mixer.clipAction(clip);
  const loop = output.loop === false ? THREE.LoopOnce : THREE.LoopRepeat;
  const clampWhenFinished = output.loop === false && !!output.clampWhenFinished;
  if (representation.currentClipName === clip.name && representation.currentAction === action) {
    const loopChanged = action.loop !== loop || action.clampWhenFinished !== clampWhenFinished;
    if (loopChanged) {
      action.reset();
      action.setLoop(loop, output.loop === false ? 1 : Infinity);
      action.clampWhenFinished = clampWhenFinished;
      action.play();
    }
    action.setEffectiveTimeScale(output.speed ?? 1);
    return;
  }

  action.reset();
  action.setEffectiveTimeScale(output.speed ?? 1);
  action.setLoop(loop, output.loop === false ? 1 : Infinity);
  action.clampWhenFinished = clampWhenFinished;
  if (representation.currentAction && representation.currentAction !== action) {
    action.crossFadeFrom(
      representation.currentAction,
      output.crossFadeDuration ?? 0.2,
      true,
    );
  }
  action.play();
  representation.currentAction = action;
  representation.currentClipName = clip.name;
}

function disposeOwnedWeaponResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((child: any) => {
    if (!child.userData?.remoteOwned) return;
    if (child.geometry) geometries.add(child.geometry);
    if (child.material) {
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        materials.add(material);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export function createLocalPlayerRepresentation(canonicalModel: THREE.Group): LocalPlayerRepresentation {
  const root = new THREE.Group();
  root.name = "LocalPlayerRepresentation";
  root.userData.canonicalPlayerRepresentation = true;

  const model = SkeletonUtils.clone(canonicalModel) as THREE.Group;
  model.name = "LocalPlayerCharacter";
  model.userData.canonicalPlayerModelClone = true;
  (model as any).animations = (canonicalModel as any).animations;
  root.add(model);

  const eyeAnchor = new THREE.Object3D();
  eyeAnchor.name = "PlayerEyeAnchor";
  eyeAnchor.userData.playerEyeAnchor = true;
  root.add(eyeAnchor);

  const representation: LocalPlayerRepresentation = {
    root,
    model,
    eyeAnchor,
    mixer: new THREE.AnimationMixer(model),
    headFilter: hideFirstPersonHead(model),
    currentAction: null,
    currentClipName: null,
  };

  markSharedResources(model);
  applyAnimationOutput(representation, resolvePlayerAnimationState({ isAlive: true }));
  root.updateMatrixWorld(true);
  updateEyeAnchor(representation, PLAYER_EYE_LEVEL);
  return representation;
}

export function syncLocalPlayerRepresentation(
  representation: LocalPlayerRepresentation,
  playerPosition: THREE.Vector3,
  playerYaw: number,
  eyeHeight = PLAYER_EYE_LEVEL,
): void {
  representation.root.position.set(
    playerPosition.x,
    playerPosition.y - PLAYER_CENTER_OFFSET,
    playerPosition.z,
  );
  representation.root.rotation.set(0, playerYaw, 0);
  representation.root.updateMatrixWorld(true);
  updateEyeAnchor(representation, eyeHeight);
}

export function getLocalPlayerEyeWorldPosition(
  representation: LocalPlayerRepresentation,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  representation.eyeAnchor.getWorldPosition(target);
  return target;
}

export function disposeLocalPlayerRepresentation(
  representation: LocalPlayerRepresentation,
): void {
  representation.mixer.stopAllAction();
  representation.mixer.uncacheRoot(representation.model);
  disposeGeneratedPoseResources(representation.model);
  representation.root.removeFromParent();
}

export class LocalPlayerVisualSystem {
  public representation: LocalPlayerRepresentation | null = null;
  public weaponDiagnostics: PoseDiagnostics | null = null;
  private weapon: THREE.Object3D | null = null;
  private weaponId: string | null = null;
  private weaponTemplateAvailable = false;
  private poseContext: string | null = null;
  private poseCandidate: PoseCandidate | null = null;

  constructor(private readonly scene: THREE.Scene) {}

  public setCanonicalModel(canonicalModel: THREE.Group | null): void {
    if (!canonicalModel) {
      this.dispose();
      return;
    }
    if (this.representation && this.representation.root.userData.sourceModel === canonicalModel) return;

    this.dispose();
    this.representation = createLocalPlayerRepresentation(canonicalModel);
    this.representation.root.userData.sourceModel = canonicalModel;
    this.scene.add(this.representation.root);
  }

  public get ownsWeapon(): boolean {
    return this.weapon !== null;
  }

  private disposeWeapon(): void {
    if (!this.weapon) return;
    this.weapon.removeFromParent();
    disposeOwnedWeaponResources(this.weapon);
    this.weapon = null;
    this.weaponId = null;
    this.weaponTemplateAvailable = false;
    this.poseContext = null;
    this.poseCandidate = null;
    this.weaponDiagnostics = null;
  }

  private ensureWeapon(weaponId: string): void {
    if (!this.representation) return;
    const templateAvailable = hasRemoteWeaponTemplate(weaponId);
    const needsReplacement = this.weaponId !== weaponId
      || (!this.weaponTemplateAvailable && templateAvailable);
    if (!needsReplacement && this.weapon) return;

    this.disposeWeapon();
    this.weapon = createRemotePlayerWeapon(weaponId);
    this.weapon.name = `LocalPlayerWeapon_${weaponId}`;
    this.weapon.userData.localPlayerWeapon = true;
    this.weapon.visible = false;
    this.weaponId = weaponId;
    this.weaponTemplateAvailable = templateAvailable;
    this.representation.model.add(this.weapon);
  }

  public updateWeaponPose(camera: THREE.Camera): void {
    if (!this.representation || !this.weapon || !this.weaponId) return;
    const poseContext = `${this.weaponId}:${this.representation.currentClipName || "unanimated"}`;
    const holdFrame = getPlayerHoldFrame(this.weaponId, this.representation.currentClipName);
    const forwardPitch = (this.poseCandidate?.forwardPitch ?? 0) - camera.rotation.x;
    let diagnostics: PoseDiagnostics;
    if (this.poseContext === poseContext) {
      diagnostics = solveVerifiedGripPose(this.representation.model, this.weapon, {
        weaponId: this.weaponId,
        poseContext,
        holdFrame,
        forwardPitch,
        diagnostics: true,
      });
    } else {
      const pose = chooseVerifiedGripPose(this.representation.model, this.weapon, undefined, {
        weaponId: this.weaponId,
        poseContext,
        holdFrame,
        diagnostics: true,
      });
      this.poseContext = poseContext;
      this.poseCandidate = pose.diagnostics.verified ? pose.selected : null;
      diagnostics = solveVerifiedGripPose(this.representation.model, this.weapon, {
        weaponId: this.weaponId,
        poseContext,
        holdFrame,
        forwardPitch: (this.poseCandidate?.forwardPitch ?? 0) - camera.rotation.x,
        diagnostics: true,
      });
    }
    this.weaponDiagnostics = diagnostics;
    this.weapon.visible = diagnostics.verified;
  }

  public getMuzzleWorldPosition(target: THREE.Vector3): boolean {
    if (!this.weapon || !this.weaponId || !this.weapon.visible || !this.weaponDiagnostics?.verified) return false;
    this.weapon.updateMatrixWorld(true);
    const muzzle = resolveGripAnchors(this.weapon, this.weaponId).muzzle.point;
    target.copy(muzzle).applyMatrix4(this.weapon.matrixWorld);
    return target.x === target.x && target.y === target.y && target.z === target.z;
  }

  public update(
    dt: number,
    playerPosition: THREE.Vector3,
    playerYaw: number,
    camera: THREE.Camera,
    eyeHeight = PLAYER_EYE_LEVEL,
    animationContext: PlayerAnimationContext = { isAlive: true },
  ): void {
    if (!this.representation) return;
    this.ensureWeapon(animationContext.weapon ?? "rifle");
    applyAnimationOutput(
      this.representation,
      resolvePlayerAnimationState(animationContext),
    );
    this.representation.mixer.update(dt);
    syncLocalPlayerRepresentation(this.representation, playerPosition, playerYaw, eyeHeight);
    getLocalPlayerEyeWorldPosition(this.representation, camera.position);
  }

  public dispose(): void {
    this.disposeWeapon();
    if (!this.representation) return;
    disposeLocalPlayerRepresentation(this.representation);
    this.representation = null;
  }
}
