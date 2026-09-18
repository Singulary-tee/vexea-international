import * as THREE from "three/webgpu";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import type { MatchController } from "../../MatchController";
import { PLAYER_CENTER_OFFSET, PLAYER_RADIUS, PLAYER_TOTAL_HEIGHT } from "../../../shared/constants";
import { resolvePlayerAnimationState } from "../../../shared/state-animation-contract";
import { fixSkinnedMeshBones } from "../../StudioPreviewManager";
import { audioManager } from "../../audio";
import {
  createRemotePlayerWeapon,
  disposeRemoteWeaponTemplates,
  hasRemoteWeaponTemplate,
} from "../../weapons_model";
import {
  chooseVerifiedGripPose,
  solveVerifiedGripPose,
  type PoseCandidate,
} from "../../weapons/pose-solver";
import { getPlayerHoldFrame } from "../../weapons/player-hold-ik";

export function shouldShowRemotePlayerWeapon(hasPlayerModel: boolean, poseVerified: boolean): boolean {
  return !hasPlayerModel || poseVerified;
}

export function shouldReplaceRemotePlayerWeapon(
  remoteWeapon: THREE.Object3D | undefined,
  remoteWeaponType: string | undefined,
  currentWeaponType: string,
  exactTemplateAvailable: boolean,
): boolean {
  if (!remoteWeapon || remoteWeaponType !== currentWeaponType) return true;
  return exactTemplateAvailable && remoteWeapon.name === `RemoteWeapon_Fallback_${currentWeaponType}`;
}

export function getRemotePlayerModelY(networkPositionY: number): number {
  return networkPositionY - PLAYER_CENTER_OFFSET;
}

export function getRemoteBaseForwardPitch(candidate: PoseCandidate | undefined, verified: boolean): number {
  return verified ? candidate?.forwardPitch ?? 0 : 0;
}

export function getRemoteWeaponForwardPitch(baseForwardPitch: number, networkPitch: number): number {
  return baseForwardPitch - THREE.MathUtils.clamp(networkPitch, -0.5, 0.5);
}

export function shouldApplyRemoteWeaponEquip(lastSequence: number, incomingSequence: number): boolean {
  return incomingSequence > lastSequence;
}

function markSharedRemoteResources(root: THREE.Object3D): void {
  root.traverse((child: any) => {
    if (child.geometry) child.geometry.userData.vexeaSharedAsset = true;
    if (child.material) {
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        material.userData.vexeaSharedAsset = true;
      }
    }
  });
}

export function disposeOwnedRemoteResources(root: THREE.Object3D): void {
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

export function createRemoteWeaponMixer(weapon: THREE.Object3D): THREE.AnimationMixer | undefined {
  const animations = (weapon as any).animations as THREE.AnimationClip[] | undefined;
  if (!animations?.length) return undefined;

  const mixer = new THREE.AnimationMixer(weapon);
  const idleClip = animations.find((clip) => clip.name.toLowerCase() === "idle")
    || animations.find((clip) => clip.name.toLowerCase().includes("idle"));
  if (idleClip) {
    const idleAction = mixer.clipAction(idleClip);
    idleAction.play();
    (mixer as any)._remoteWeaponIdleAction = idleAction;
    (mixer as any)._remoteWeaponCurrentAction = idleAction;
  }
  (mixer as any)._remoteWeaponAnimations = animations;
  mixer.addEventListener("finished", (event: any) => {
    if (event.action !== (mixer as any)._remoteWeaponEquipAction) return;
    const idleAction = (mixer as any)._remoteWeaponIdleAction as THREE.AnimationAction | undefined;
    if (!idleAction) {
      event.action.stop();
      (mixer as any)._remoteWeaponCurrentAction = undefined;
      return;
    }
    idleAction.reset();
    idleAction.setLoop(THREE.LoopRepeat, Infinity);
    idleAction.fadeIn(0.1).play();
    (mixer as any)._remoteWeaponCurrentAction = idleAction;
  });
  return mixer;
}

export function playRemoteWeaponEquip(mixer: THREE.AnimationMixer): boolean {
  const animations = (mixer as any)._remoteWeaponAnimations as THREE.AnimationClip[] | undefined;
  const equipClip = animations?.find((clip) => clip.name === "equip");
  if (!equipClip) return false;

  const previousAction = (mixer as any)._remoteWeaponCurrentAction as THREE.AnimationAction | undefined;
  const equipAction = mixer.clipAction(equipClip);
  equipAction.reset();
  equipAction.setLoop(THREE.LoopOnce, 1);
  equipAction.clampWhenFinished = false;
  if (previousAction && previousAction !== equipAction) {
    equipAction.crossFadeFrom(previousAction, 0.1, true);
  }
  equipAction.play();
  (mixer as any)._remoteWeaponEquipAction = equipAction;
  (mixer as any)._remoteWeaponCurrentAction = equipAction;
  return true;
}

export function applyRemoteWeaponEquipIfNew(
  group: THREE.Object3D,
  incomingSequence: number,
  mixer?: THREE.AnimationMixer,
): boolean {
  const lastSequence = (group as any)._lastWeaponEquipSequence ?? 0;
  if (!shouldApplyRemoteWeaponEquip(lastSequence, incomingSequence)) return false;
  if (!mixer) return false;

  (group as any)._lastWeaponEquipSequence = incomingSequence;
  playRemoteWeaponEquip(mixer);
  return true;
}

export function disposeRemoteWeaponInstance(
  parent: THREE.Object3D,
  weapon: THREE.Object3D | undefined,
  mixer?: THREE.AnimationMixer,
): void {
  mixer?.stopAllAction();
  if (weapon) mixer?.uncacheRoot(weapon);
  if (!weapon) return;
  parent.remove(weapon);
  disposeOwnedRemoteResources(weapon);
}

function disposeRemotePlayerMixer(mixer?: THREE.AnimationMixer, root?: THREE.Object3D): void {
  if (!mixer) return;
  mixer.stopAllAction();
  const mixerRoot = root || (typeof (mixer as any).getRoot === "function" ? mixer.getRoot() : undefined);
  if (mixerRoot && typeof (mixer as any).uncacheRoot === "function") {
    mixer.uncacheRoot(mixerRoot);
  }
}

export class RemotePlayerSystem {
  private match: MatchController;
  private remotePlayerFootsteps = new Map<string, { lastPos: THREE.Vector3; timer: number; variant: number }>();

  constructor(match: MatchController) {
    this.match = match;
  }

  public init() {}

  private createRemotePlayerVisual(activePlayerModel: THREE.Object3D | null): {
    group: THREE.Group;
    mixer?: THREE.AnimationMixer;
  } {
    if (activePlayerModel) {
      const group = SkeletonUtils.clone(activePlayerModel) as THREE.Group;
      markSharedRemoteResources(group);

      // Rebind cloned skinned mesh elements to cloned bone instances
      fixSkinnedMeshBones(group, activePlayerModel);

      // Disable expensive SkinnedMesh raycasting
      group.traverse((child: any) => {
        if (child.isSkinnedMesh) child.raycast = () => {};
      });

      // Add invisible collision box for hit detection
      const hitBoxGeom = new THREE.BoxGeometry(PLAYER_RADIUS * 2, PLAYER_TOTAL_HEIGHT, PLAYER_RADIUS * 2);
      hitBoxGeom.translate(0, PLAYER_TOTAL_HEIGHT / 2, 0);
      const hitBox = new THREE.Mesh(hitBoxGeom, new THREE.MeshBasicMaterial());
      hitBox.visible = false;
      hitBox.name = "PlayerHitBox";
      hitBox.userData.remoteOwned = true;
      group.add(hitBox);

      group.name = "RemotePlayer";
      group.userData.remotePlayerModel = activePlayerModel;
      const mixer = new THREE.AnimationMixer(group);
      const animations = (activePlayerModel as any).animations as THREE.AnimationClip[] | undefined;
      if (animations && animations.length > 0) {
        const idleClip = animations.find((clip) => clip.name.toLowerCase().includes("idle")) || animations[0];
        const action = mixer.clipAction(idleClip);
        action.play();
        (group as any)._currentAction = action;
        (group as any)._currentClipName = idleClip.name;
      }
      return { group, mixer };
    }

    const group = new THREE.Group();
    group.name = "RemotePlayerFallback";
    group.userData.remotePlayerFallback = true;
    const fallback = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.2, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
    );
    fallback.userData.remoteOwned = true;
    group.add(fallback);
    return { group };
  }

  public step(dt: number) {
    this.update(dt);
  }

  public removePlayer(id: string): void {
    this.remotePlayerFootsteps.delete(id);

    const group = this.match.remotePlayersMeshes.get(id);
    if (group) {
      disposeRemoteWeaponInstance(
        group,
        (group as any)._remoteWeaponMesh,
        (group as any)._remoteWeaponMixer,
      );
      this.match.scene.remove(group);
      disposeOwnedRemoteResources(group);
      this.match.remotePlayersMeshes.delete(id);
    }

    const mixer = this.match.remotePlayerMixers.get(id);
    disposeRemotePlayerMixer(mixer, group);
    this.match.remotePlayerMixers.delete(id);
    this.match.remotePlayersTargetData.delete(id);
  }

  public update(dt: number) {
    const match = this.match;
    if (!match || !match.remotePlayersTargetData) return;

    const activePlayerModel = match.context?.playerModel || (window as any).playerModel;

    match.remotePlayersTargetData.forEach((data, id) => {
      let group = match.remotePlayersMeshes.get(id);
      let mixer = match.remotePlayerMixers.get(id);

      if (
        !group
        || (activePlayerModel && (
          group.userData.remotePlayerFallback
          || group.userData.remotePlayerModel !== activePlayerModel
        ))
      ) {
        const previousGroup = group;
        const previousEquipSequence = previousGroup && (previousGroup as any)._lastWeaponEquipSequence;
        const previousPosition = previousGroup?.position.clone();
        const previousQuaternion = previousGroup?.quaternion.clone();
        const previousScale = previousGroup?.scale.clone();
        disposeRemotePlayerMixer(mixer, previousGroup);
        match.remotePlayerMixers.delete(id);
        if (previousGroup) {
          disposeRemoteWeaponInstance(
            previousGroup,
            (previousGroup as any)._remoteWeaponMesh,
            (previousGroup as any)._remoteWeaponMixer,
          );
          match.scene.remove(previousGroup);
          disposeOwnedRemoteResources(previousGroup);
        }

        const visual = this.createRemotePlayerVisual(activePlayerModel || null);
        group = visual.group;
        mixer = visual.mixer;
        if (previousPosition) group.position.copy(previousPosition);
        if (previousQuaternion) group.quaternion.copy(previousQuaternion);
        if (previousScale) group.scale.copy(previousScale);
        if (previousEquipSequence !== undefined) {
          (group as any)._lastWeaponEquipSequence = previousEquipSequence;
        }
        match.scene.add(group);
        match.remotePlayersMeshes.set(id, group);
        if (mixer) match.remotePlayerMixers.set(id, mixer);
        else match.remotePlayerMixers.delete(id);
      }

      if (group) {
        let rpState = this.remotePlayerFootsteps.get(id);
        if (!rpState) {
          rpState = { lastPos: new THREE.Vector3().copy(group.position), timer: 0, variant: 0 };
          this.remotePlayerFootsteps.set(id, rpState);
        }

        group.position.x += (data.pos.x - group.position.x) * 0.15;
        group.position.y += (getRemotePlayerModelY(data.pos.y) - group.position.y) * 0.15;
        group.position.z += (data.pos.z - group.position.z) * 0.15;
        const movedDist = group.position.distanceTo(rpState.lastPos);
        rpState.lastPos.copy(group.position);
        const speed = dt > 0 ? movedDist / dt : 0;

        if (speed > 0.1) {
          const isRunning = speed > 6.0;
          const interval = isRunning ? 0.33 : 0.52;
          rpState.timer += dt;
          if (rpState.timer >= interval) {
            rpState.timer = 0;
            rpState.variant = 1 - rpState.variant;
            const stepNum = rpState.variant === 0 ? "01" : "02";
            const prefix = isRunning ? "run" : "walk";
            const soundKey = `${prefix}_ground_${stepNum}`;
            audioManager.playPositional(soundKey, group.position);
          }
        } else {
          rpState.timer = 0;
        }

        const yawDelta = THREE.MathUtils.euclideanModulo(data.yaw - group.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
        group.rotation.y += yawDelta * 0.15;

        // Resolve and transition remote player animation state from shared contract (ARCH-15)
        if (mixer && activePlayerModel?.animations) {
          const animOutput = resolvePlayerAnimationState({
            isAlive: data.isAlive,
            isFiring: data.isFiring,
            isReloading: data.isReloading,
            isAiming: data.isAiming,
            isGrounded: data.isGrounded,
            isCrouching: data.isCrouching,
            isSprinting: data.isSprinting,
            speed,
            weapon: data.weapon,
          });

          if (animOutput.kind === "clip") {
            const newClip = activePlayerModel.animations.find((a: any) => a.name === animOutput.clipName) || activePlayerModel.animations[0];
            if (!newClip) return;
            const targetClipName = newClip.name;
            const currentClipName = (group as any)._currentClipName;
            const currentAction = (group as any)._currentAction as THREE.AnimationAction | undefined;
            const loop = animOutput.loop === false ? THREE.LoopOnce : THREE.LoopRepeat;
            const clampWhenFinished = animOutput.loop === false && !!animOutput.clampWhenFinished;
            if (currentClipName === targetClipName && currentAction) {
              if (currentAction.loop !== loop || currentAction.clampWhenFinished !== clampWhenFinished) {
                currentAction.reset();
                currentAction.setLoop(loop, animOutput.loop === false ? 1 : Infinity);
                currentAction.clampWhenFinished = clampWhenFinished;
                currentAction.play();
              }
              if (animOutput.speed !== undefined) currentAction.setEffectiveTimeScale(animOutput.speed);
            } else {
              const prevAction = currentAction;
              const newAction = mixer.clipAction(newClip);
              newAction.reset();
              if (animOutput.speed !== undefined) newAction.setEffectiveTimeScale(animOutput.speed);
              newAction.setLoop(loop, animOutput.loop === false ? 1 : Infinity);
              newAction.clampWhenFinished = clampWhenFinished;
              if (prevAction && prevAction !== newAction) {
                newAction.crossFadeFrom(prevAction, animOutput.crossFadeDuration ?? 0.2, true);
              }
              newAction.play();
              (group as any)._currentAction = newAction;
              (group as any)._currentClipName = newClip.name;
            }
          }
        }

        // Apply the verified held-item pose after animation updates so sockets follow the current frame.
        if (mixer) {
          mixer.update(dt);
        }

        // Attach the canonical third-person weapon model and solve its two-hand pose.
        const currentWeaponType = data.weapon || "rifle";
        let remoteWeaponMesh = (group as any)._remoteWeaponMesh as THREE.Group | undefined;
        let remoteWeaponMixer = (group as any)._remoteWeaponMixer as THREE.AnimationMixer | undefined;
        const remoteWeaponType = (group as any)._remoteWeaponType;

        if (shouldReplaceRemotePlayerWeapon(
          remoteWeaponMesh,
          remoteWeaponType,
          currentWeaponType,
          hasRemoteWeaponTemplate(currentWeaponType),
        )) {
          if (remoteWeaponMesh) {
            disposeRemoteWeaponInstance(group, remoteWeaponMesh, remoteWeaponMixer);
          }
          remoteWeaponMesh = createRemotePlayerWeapon(currentWeaponType);
          if (remoteWeaponMesh) {
            group.add(remoteWeaponMesh);
            remoteWeaponMesh.visible = false;
            (group as any)._remoteWeaponMesh = remoteWeaponMesh;
            (group as any)._remoteWeaponType = currentWeaponType;
            remoteWeaponMixer = createRemoteWeaponMixer(remoteWeaponMesh);
            (group as any)._remoteWeaponMixer = remoteWeaponMixer;
            (group as any)._baseVerifiedGripCandidate = undefined;
            (group as any)._baseVerifiedPoseContext = undefined;
            (group as any)._verifiedPoseDiagnostics = undefined;
          } else {
            (group as any)._remoteWeaponMesh = undefined;
            (group as any)._remoteWeaponType = undefined;
            (group as any)._remoteWeaponMixer = undefined;
            remoteWeaponMixer = undefined;
            (group as any)._baseVerifiedGripCandidate = undefined;
            (group as any)._baseVerifiedPoseContext = undefined;
            (group as any)._verifiedPoseDiagnostics = undefined;
          }
        }

        const equipSequence = data.weaponEquipSequence ?? 0;
        applyRemoteWeaponEquipIfNew(group, equipSequence, remoteWeaponMixer);
        if (remoteWeaponMixer) remoteWeaponMixer.update(dt);

        if (remoteWeaponMesh) {
          if (activePlayerModel) {
            const posePitch = Math.round(THREE.MathUtils.clamp(data.pitch || 0, -0.5, 0.5) * 100) / 100;
            const currentClipName = (group as any)._currentClipName as string | undefined;
            const holdFrame = getPlayerHoldFrame(currentWeaponType, currentClipName);
            const basePoseContext = `${currentWeaponType}:${currentClipName || "unanimated"}`;
            const poseContext = `${basePoseContext}:${posePitch}`;
            let baseCandidate = (group as any)._baseVerifiedGripCandidate as PoseCandidate | undefined;
            if ((group as any)._baseVerifiedPoseContext !== basePoseContext) {
              const basePose = chooseVerifiedGripPose(group, remoteWeaponMesh, undefined, {
                weaponId: currentWeaponType,
                poseContext: basePoseContext,
                holdFrame,
                diagnostics: true,
              });
              baseCandidate = basePose.diagnostics.verified ? basePose.selected : undefined;
              (group as any)._baseVerifiedGripCandidate = baseCandidate;
              (group as any)._baseVerifiedPoseContext = basePoseContext;
            }
            const diagnostics = solveVerifiedGripPose(group, remoteWeaponMesh, {
              weaponId: currentWeaponType,
              poseContext,
              holdFrame,
              forwardPitch: getRemoteWeaponForwardPitch(
                getRemoteBaseForwardPitch(baseCandidate, !!baseCandidate),
                posePitch,
              ),
              diagnostics: true,
            });
            (group as any)._verifiedPoseDiagnostics = diagnostics;
            if (!shouldShowRemotePlayerWeapon(true, diagnostics.verified)) {
              (group as any)._baseVerifiedGripCandidate = undefined;
              (group as any)._baseVerifiedPoseContext = undefined;
            }
            remoteWeaponMesh.visible = shouldShowRemotePlayerWeapon(true, diagnostics.verified);
          } else {
            (group as any)._baseVerifiedGripCandidate = undefined;
            (group as any)._baseVerifiedPoseContext = undefined;
            (group as any)._verifiedPoseDiagnostics = undefined;
            remoteWeaponMesh.visible = shouldShowRemotePlayerWeapon(false, false);
          }
        }
      }
    });

    // Cleanup stale remote players
    for (const id of match.remotePlayersMeshes.keys()) {
      if (!match.remotePlayersTargetData.has(id)) {
        this.removePlayer(id);
      }
    }
  }

  public destroy() {
    this.remotePlayerFootsteps.clear();
    const ids = new Set([
      ...this.match.remotePlayersMeshes.keys(),
      ...this.match.remotePlayerMixers.keys(),
      ...this.match.remotePlayersTargetData.keys(),
    ]);
    for (const id of ids) {
      this.removePlayer(id);
    }
    this.match.remotePlayersMeshes.clear();
    this.match.remotePlayersTargetData.clear();
    this.match.remotePlayerMixers.clear();
    disposeRemoteWeaponTemplates();
  }
}
